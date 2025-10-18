"""
SQLAlchemy database models for SwinFace
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Date, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class Student(Base):
    """Student model with face embeddings"""
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255))
    face_embeddings = Column(JSON)  # Store face embeddings as JSON
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    attendance_records = relationship("Attendance", back_populates="student")
    activity_records = relationship("ActivityTracking", back_populates="student")

class Class(Base):
    """Class/Subject model"""
    __tablename__ = "classes"
    
    id = Column(Integer, primary_key=True, index=True)
    subject_code = Column(String(50), nullable=False)
    class_code = Column(String(100), nullable=False)
    description = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sessions = relationship("Session", back_populates="class_obj")

class Session(Base):
    """Class session model"""
    __tablename__ = "sessions"
    
    id = Column(Integer, primary_key=True, index=True)
    class_id = Column(Integer, ForeignKey("classes.id", ondelete="CASCADE"))
    date = Column(Date, nullable=False)
    video_path = Column(String(500))
    processed_video_path = Column(String(500))
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    processing_progress = Column(Integer, default=0)
    total_students = Column(Integer, default=0)
    present_count = Column(Integer, default=0)
    absent_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    class_obj = relationship("Class", back_populates="sessions")
    attendance_records = relationship("Attendance", back_populates="session")
    activity_records = relationship("ActivityTracking", back_populates="session")
    graphs = relationship("ActivityGraph", back_populates="session", uselist=False)

class Attendance(Base):
    """Attendance record model"""
    __tablename__ = "attendance"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), index=True)
    status = Column(String(20), nullable=False)  # Present, Absent
    confidence = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="attendance_records")
    student = relationship("Student", back_populates="attendance_records")

class ActivityTracking(Base):
    """Activity tracking model for motion analysis"""
    __tablename__ = "activity_tracking"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="SET NULL"), index=True, nullable=True)
    track_id = Column(Integer, nullable=False)
    frame = Column(Integer, nullable=False)
    movement = Column(Float, nullable=False)
    ema = Column(Float, nullable=False)
    activity_level = Column(String(20))  # Active, Inactive
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="activity_records")
    student = relationship("Student", back_populates="activity_records")

class ActivityGraph(Base):
    """Activity visualization graphs model"""
    __tablename__ = "activity_graphs"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), unique=True)
    ema_plot_path = Column(String(500))
    index_plot_path = Column(String(500))
    rolling_plot_path = Column(String(500))
    interactive_html_path = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    session = relationship("Session", back_populates="graphs")

