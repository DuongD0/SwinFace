"""
FastAPI application for SwinFace video processing service
"""
import os
import uuid
import asyncio
from pathlib import Path
from typing import Dict, Optional, List
from datetime import date
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, BackgroundTasks, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import numpy as np

from config import settings
from database import get_db, init_db
from models import Student, Class, Session as DBSession, Attendance, ActivityTracking, ActivityGraph
from video_processor import VideoProcessor
from face_recognition import FaceRecognizer

# Initialize FastAPI app
app = FastAPI(
    title="SwinFace API",
    description="Face tracking and attendance monitoring system",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state for processing jobs
processing_jobs: Dict[str, Dict] = {}

# Initialize video processor
yolo_model_path = settings.models_dir / settings.yolo_model
video_processor = VideoProcessor(str(yolo_model_path), settings.output_dir)

# Initialize face recognizer
face_recognizer = FaceRecognizer()

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()
    print("SwinFace Python Service started successfully!")

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "SwinFace Python Service",
        "status": "running",
        "version": "1.0.0"
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy"}

@app.post("/process-video")
async def process_video(
    background_tasks: BackgroundTasks,
    video_file: UploadFile = File(...),
    class_id: int = Form(...),
    session_date: str = Form(...),
    db: Session = Depends(get_db)
):
    """
    Upload and process a video for face tracking and attendance
    
    Args:
        video_file: Video file to process
        class_id: ID of the class
        session_date: Date of the session (YYYY-MM-DD)
        db: Database session
    
    Returns:
        Job ID for tracking processing status
    """
    try:
        # Validate class exists
        class_obj = db.query(Class).filter(Class.id == class_id).first()
        if not class_obj:
            raise HTTPException(status_code=404, detail="Class not found")
        
        # Parse date
        try:
            session_date_obj = date.fromisoformat(session_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Check if session already exists
        existing_session = db.query(DBSession).filter(
            DBSession.class_id == class_id,
            DBSession.date == session_date_obj
        ).first()
        
        if existing_session:
            raise HTTPException(status_code=400, detail="Session already exists for this class and date")
        
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        # Save uploaded video
        video_filename = f"{job_id}_{video_file.filename}"
        video_path = settings.upload_dir / video_filename
        
        with open(video_path, "wb") as f:
            content = await video_file.read()
            f.write(content)
        
        # Create session record
        new_session = DBSession(
            class_id=class_id,
            date=session_date_obj,
            video_path=str(video_path),
            status="processing",
            processing_progress=0
        )
        db.add(new_session)
        db.commit()
        db.refresh(new_session)
        
        # Initialize job status
        processing_jobs[job_id] = {
            "status": "processing",
            "progress": 0,
            "session_id": new_session.id,
            "error": None
        }
        
        # Start background processing
        background_tasks.add_task(
            process_video_task,
            job_id,
            new_session.id,
            str(video_path)
        )
        
        return {
            "job_id": job_id,
            "session_id": new_session.id,
            "status": "processing",
            "message": "Video uploaded successfully. Processing started."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error uploading video: {str(e)}")

async def process_video_task(job_id: str, session_id: int, video_path: str):
    """Background task to process video"""
    try:
        from database import get_db_session
        
        # Load known student faces
        with get_db_session() as db:
            students = db.query(Student).filter(Student.face_embeddings.isnot(None)).all()
            known_embeddings = {}
            
            for student in students:
                if student.face_embeddings:
                    embeddings_list = []
                    for emb_dict in student.face_embeddings:
                        if 'embedding' in emb_dict:
                            embeddings_list.append(np.array(emb_dict['embedding']))
                    if embeddings_list:
                        known_embeddings[student.id] = embeddings_list
        
        # Progress callback
        def update_progress(progress: int):
            processing_jobs[job_id]["progress"] = progress
            # Update database
            with get_db_session() as db:
                session = db.query(DBSession).filter(DBSession.id == session_id).first()
                if session:
                    session.processing_progress = progress
                    db.commit()
        
        # Process video
        results = video_processor.process_video(
            video_path,
            session_id,
            known_embeddings if known_embeddings else None,
            progress_callback=update_progress
        )
        
        # Update database with results
        with get_db_session() as db:
            # Update session
            session = db.query(DBSession).filter(DBSession.id == session_id).first()
            session.status = "completed"
            session.processing_progress = 100
            session.processed_video_path = results['output_video_path']
            
            # Save activity tracking data
            for track_id, log_entries in results['motion_data'].items():
                student_id = results['track_to_student'].get(track_id)
                
                for entry in log_entries:
                    activity_record = ActivityTracking(
                        session_id=session_id,
                        student_id=student_id,
                        track_id=track_id,
                        frame=entry['frame'],
                        movement=entry['movement'],
                        ema=entry['ema'],
                        activity_level=entry['activity_level']
                    )
                    db.add(activity_record)
            
            # Determine attendance
            present_student_ids = set(results['track_to_student'].values())
            all_students = db.query(Student).all()
            
            for student in all_students:
                if student.id in present_student_ids:
                    # Calculate confidence based on number of detections
                    detections = sum(1 for tid, sid in results['track_to_student'].items() if sid == student.id)
                    confidence = min(detections / 100.0, 1.0)  # Simple confidence metric
                    
                    attendance = Attendance(
                        session_id=session_id,
                        student_id=student.id,
                        status="Present",
                        confidence=confidence
                    )
                else:
                    attendance = Attendance(
                        session_id=session_id,
                        student_id=student.id,
                        status="Absent",
                        confidence=1.0
                    )
                db.add(attendance)
            
            # Update session counts
            session.present_count = len(present_student_ids)
            session.absent_count = len(all_students) - len(present_student_ids)
            session.total_students = len(all_students)
            
            # Save activity graphs
            if 'analytics' in results and results['analytics']:
                analytics = results['analytics']
                graphs = ActivityGraph(
                    session_id=session_id,
                    ema_plot_path=analytics['plots'].get('ema_plot'),
                    index_plot_path=analytics['plots'].get('index_plot'),
                    rolling_plot_path=analytics['plots'].get('rolling_plot'),
                    interactive_html_path=analytics['plots'].get('interactive_plot')
                )
                db.add(graphs)
            
            db.commit()
        
        # Update job status
        processing_jobs[job_id]["status"] = "completed"
        processing_jobs[job_id]["progress"] = 100
        processing_jobs[job_id]["results"] = results
    
    except Exception as e:
        print(f"Error processing video: {e}")
        processing_jobs[job_id]["status"] = "failed"
        processing_jobs[job_id]["error"] = str(e)
        
        # Update database
        with get_db_session() as db:
            session = db.query(DBSession).filter(DBSession.id == session_id).first()
            if session:
                session.status = "failed"
                db.commit()

@app.get("/processing-status/{job_id}")
async def get_processing_status(job_id: str):
    """
    Get status of video processing job
    
    Args:
        job_id: Job ID returned from process-video endpoint
    
    Returns:
        Current status and progress of the job
    """
    if job_id not in processing_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return processing_jobs[job_id]

@app.post("/register-face")
async def register_face(
    student_id: int = Form(...),
    face_image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Register a face for a student
    
    Args:
        student_id: ID of the student
        face_image: Image file containing the student's face
        db: Database session
    
    Returns:
        Success message
    """
    try:
        # Validate student exists
        student = db.query(Student).filter(Student.id == student_id).first()
        if not student:
            raise HTTPException(status_code=404, detail="Student not found")
        
        # Save uploaded image temporarily
        temp_image_path = settings.upload_dir / f"temp_{uuid.uuid4()}_{face_image.filename}"
        with open(temp_image_path, "wb") as f:
            content = await face_image.read()
            f.write(content)
        
        # Register face
        embedding = face_recognizer.register_student_face(
            student.name,
            str(temp_image_path),
            settings.known_faces_dir
        )
        
        if embedding is None:
            temp_image_path.unlink()  # Clean up
            raise HTTPException(status_code=400, detail="No face detected in image")
        
        # Update student's face embeddings in database
        if student.face_embeddings is None:
            student.face_embeddings = []
        
        student.face_embeddings.append({
            "embedding": embedding.tolist(),
            "registered_at": str(date.today())
        })
        db.commit()
        
        # Clean up temp file
        temp_image_path.unlink()
        
        return {
            "message": "Face registered successfully",
            "student_id": student_id,
            "student_name": student.name
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error registering face: {str(e)}")

@app.get("/students")
async def get_students(db: Session = Depends(get_db)):
    """Get all students"""
    students = db.query(Student).all()
    return [
        {
            "id": s.id,
            "student_id": s.student_id,
            "name": s.name,
            "email": s.email,
            "has_face_registered": s.face_embeddings is not None and len(s.face_embeddings) > 0
        }
        for s in students
    ]

@app.post("/students")
async def create_student(
    student_id: str = Form(...),
    name: str = Form(...),
    email: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Create a new student"""
    try:
        # Check if student_id already exists
        existing = db.query(Student).filter(Student.student_id == student_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Student ID already exists")
        
        new_student = Student(
            student_id=student_id,
            name=name,
            email=email
        )
        db.add(new_student)
        db.commit()
        db.refresh(new_student)
        
        return {
            "id": new_student.id,
            "student_id": new_student.student_id,
            "name": new_student.name,
            "email": new_student.email
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating student: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)

