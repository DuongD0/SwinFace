# SwinFace - Technical Documentation

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Workflow Documentation](#workflow-documentation)
3. [Database Schema](#database-schema)
4. [API Documentation](#api-documentation)
5. [Component Breakdown](#component-breakdown)
6. [Technology Stack](#technology-stack)
7. [Code Organization](#code-organization)
8. [Future Improvements](#future-improvements)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Browser                            │
│                    (React Frontend - Port 5173)                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/REST
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js Backend (Port 3000)                  │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐          │
│  │ Express REST │  │ File Upload │  │ PostgreSQL   │          │
│  │ API Server   │  │ Handler     │  │ Client       │          │
│  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘          │
└─────────┼─────────────────┼────────────────┼──────────────────┘
          │                 │                 │
          │ HTTP            │                 │ SQL
          ↓                 ↓                 ↓
┌─────────────────────┐  ┌────────────────────────────────────┐
│ Python FastAPI      │  │     PostgreSQL Database            │
│ Service (Port 8000) │  │                                    │
│  ┌───────────────┐  │  │  ┌─────────┐  ┌──────────────┐   │
│  │ Video         │  │  │  │ students │  │ attendance   │   │
│  │ Processor     │  │  │  ├─────────┤  ├──────────────┤   │
│  ├───────────────┤  │  │  │ classes  │  │ sessions     │   │
│  │ Face          │  │  │  ├─────────┤  ├──────────────┤   │
│  │ Recognizer    │  │  │  │ activity_│  │ activity_    │   │
│  ├───────────────┤  │  │  │ tracking │  │ graphs       │   │
│  │ YOLO Model    │  │  │  └─────────┘  └──────────────┘   │
│  │ FaceNet Model │  │  │                                    │
│  └───────────────┘  │  └────────────────────────────────────┘
└─────────────────────┘
          ↓
┌─────────────────────────────────────────────────┐
│           File System Storage                   │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐   │
│  │ uploads/│  │ outputs/│  │ known_faces/ │   │
│  │         │  │         │  │              │   │
│  │ videos  │  │ results │  │ student pics │   │
│  └─────────┘  └─────────┘  └──────────────┘   │
└─────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **User Uploads Video** → Frontend → Node.js Backend
2. **Backend Forwards** → Python FastAPI Service
3. **Python Processes**:
   - YOLO detects & tracks faces
   - FaceNet recognizes students
   - Calculates motion & activity
   - Generates visualizations
4. **Results Saved** → PostgreSQL Database
5. **Frontend Displays** → Attendance & Analytics

---

## Workflow Documentation

### 1. Video Upload Flow

```
┌──────────┐      ┌──────────────┐      ┌─────────────────┐
│  User    │      │   Frontend   │      │  Node.js Backend│
│          │      │              │      │                 │
└────┬─────┘      └──────┬───────┘      └────────┬────────┘
     │                   │                        │
     │ 1. Click Upload   │                        │
     │──────────────────>│                        │
     │                   │                        │
     │ 2. Select Video   │                        │
     │   & Class Info    │                        │
     │<──────────────────│                        │
     │                   │                        │
     │ 3. Submit         │                        │
     │──────────────────>│                        │
     │                   │ 4. POST /api/upload    │
     │                   │───────────────────────>│
     │                   │                        │
     │                   │                        ↓
     │                   │              ┌─────────────────┐
     │                   │              │ Save to uploads/│
     │                   │              │ Create session  │
     │                   │              │ in database     │
     │                   │              └─────────┬───────┘
     │                   │                        │
     │                   │              ┌─────────▼────────┐
     │                   │              │ Forward to Python│
     │                   │              │ Service          │
     │                   │              └─────────┬────────┘
     │                   │                        │
     │                   │ 5. Return job_id       │
     │                   │<───────────────────────│
     │ 6. Show Progress  │                        │
     │<──────────────────│                        │
     │   Bar             │                        │
     │                   │                        │
     └───────────────────┴────────────────────────┘
```

### 2. Video Processing Flow

```
┌─────────────────────────────────────────────────────────┐
│           Python Video Processing Pipeline              │
└─────────────────────────────────────────────────────────┘

1. Load Video
   ├─ Open video file
   ├─ Get properties (FPS, dimensions)
   └─ Initialize output video writer

2. Frame-by-Frame Processing
   ├─ Read frame
   ├─ YOLO Face Detection
   │  ├─ Detect faces in frame
   │  ├─ Generate bounding boxes
   │  └─ Assign tracking IDs
   │
   ├─ Motion Analysis
   │  ├─ Calculate position change
   │  ├─ Compute movement distance
   │  ├─ Apply EMA smoothing
   │  └─ Classify as Active/Inactive
   │
   ├─ Face Recognition (every 30 frames)
   │  ├─ Extract face crop
   │  ├─ Generate FaceNet embedding
   │  ├─ Compare with known faces
   │  └─ Match to student ID
   │
   ├─ Draw Annotations
   │  ├─ Bounding box (color-coded)
   │  ├─ Student ID/Track ID label
   │  ├─ Activity level
   │  └─ Tracking lines
   │
   └─ Write frame to output

3. Generate Analytics
   ├─ Create CSV with motion data
   ├─ Generate plots:
   │  ├─ Rolling mean plot
   │  ├─ EMA plot
   │  ├─ Activity index chart
   │  └─ Interactive Plotly visualization
   │
   └─ Save to outputs/{session_id}/

4. Update Database
   ├─ Save activity_tracking records
   ├─ Save attendance records
   ├─ Save activity_graphs paths
   └─ Update session status to "completed"
```

### 3. Face Recognition Flow

```
┌─────────────────────────────────────────────────────────┐
│              Face Registration Process                  │
└─────────────────────────────────────────────────────────┘

1. User uploads student photo
   └─> Frontend /students page

2. Backend receives request
   └─> POST /api/register-face

3. Python service processes
   ├─ Load image
   ├─ Detect face using MTCNN
   ├─ Align face (160x160)
   ├─ Extract embedding (512-dim vector) using FaceNet
   └─> Return embedding

4. Save to database
   ├─ Store embedding in students.face_embeddings (JSONB)
   └─ Copy image to known_faces/{student_name}/

┌─────────────────────────────────────────────────────────┐
│              Face Matching During Processing            │
└─────────────────────────────────────────────────────────┘

1. Load all student embeddings from database
   └─> Dict[student_id → List[embeddings]]

2. For each tracked face:
   ├─ Extract face crop from bounding box
   ├─ Generate embedding
   ├─ Compare with all known embeddings
   │  └─> Cosine similarity
   ├─ Find best match above threshold (0.6)
   └─> Assign student_id to track_id

3. Log attendance
   ├─ Present: Students matched to tracks
   └─ Absent: Students not detected
```

### 4. Real-time Processing Flow

The system supports real-time processing (designed for future webcam integration):

```
Browser → WebRTC Stream → Backend → Python Service
                                    ├─> Process frame
                                    ├─> Send results back
                                    └─> Update UI in real-time
```

---

## Database Schema

### Entity-Relationship Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   students   │         │   classes    │         │   sessions   │
├──────────────┤         ├──────────────┤         ├──────────────┤
│ id (PK)      │         │ id (PK)      │         │ id (PK)      │
│ student_id   │         │ subject_code │    ┌────│ class_id (FK)│
│ name         │         │ class_code   │    │    │ date         │
│ email        │         │ description  │    │    │ video_path   │
│ face_        │         │ created_at   │    │    │ processed_   │
│ embeddings   │         └──────┬───────┘    │    │   video_path │
│ created_at   │                │            │    │ status       │
│ updated_at   │                │ 1:N        │    │ progress     │
└──────┬───────┘                └────────────┘    │ present_count│
       │                                           │ absent_count │
       │                                           │ created_at   │
       │ 1:N                                       │ updated_at   │
       │                                           └──────┬───────┘
       │                                                  │
       │                                                  │ 1:N
       │        ┌──────────────┐                         │
       │        │  attendance  │                         │
       │        ├──────────────┤                         │
       └───────>│ id (PK)      │<────────────────────────┘
                │ session_id   │
                │   (FK)       │
                │ student_id   │
                │   (FK)       │
                │ status       │
                │ confidence   │
                │ timestamp    │
                └──────────────┘

       ┌──────────────────┐               ┌──────────────────┐
       │ activity_tracking│               │ activity_graphs  │
       ├──────────────────┤               ├──────────────────┤
       │ id (PK)          │               │ id (PK)          │
       │ session_id (FK)  │───────────────│ session_id (FK)  │
       │ student_id (FK)  │         1:1   │ ema_plot_path    │
       │ track_id         │               │ index_plot_path  │
       │ frame            │               │ rolling_plot_    │
       │ movement         │               │   path           │
       │ ema              │               │ interactive_     │
       │ activity_level   │               │   html_path      │
       │ timestamp        │               │ created_at       │
       └──────────────────┘               └──────────────────┘
```

### Table Descriptions

#### `students`
Stores student information and face recognition embeddings.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| student_id | VARCHAR(50) | Unique student identifier |
| name | VARCHAR(255) | Student full name |
| email | VARCHAR(255) | Student email (optional) |
| face_embeddings | JSONB | Array of face embedding objects |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

**face_embeddings structure:**
```json
[
  {
    "embedding": [0.123, 0.456, ...],  // 512-dim vector
    "registered_at": "2025-01-15"
  }
]
```

#### `classes`
Stores class/subject information.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| subject_code | VARCHAR(50) | Subject code (e.g., MTH10013) |
| class_code | VARCHAR(100) | Class code (e.g., MTH10013_MAY_2025_1) |
| description | TEXT | Class description |
| created_at | TIMESTAMP | Record creation time |

#### `sessions`
Stores class session information and processing status.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| class_id | INTEGER | Foreign key to classes |
| date | DATE | Session date |
| video_path | VARCHAR(500) | Path to uploaded video |
| processed_video_path | VARCHAR(500) | Path to processed video |
| status | VARCHAR(50) | pending/processing/completed/failed |
| processing_progress | INTEGER | Progress percentage (0-100) |
| total_students | INTEGER | Total students enrolled |
| present_count | INTEGER | Number of present students |
| absent_count | INTEGER | Number of absent students |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

#### `attendance`
Stores attendance records for each session.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| session_id | INTEGER | Foreign key to sessions |
| student_id | INTEGER | Foreign key to students |
| status | VARCHAR(20) | Present/Absent |
| confidence | FLOAT | Recognition confidence (0-1) |
| timestamp | TIMESTAMP | Record creation time |

#### `activity_tracking`
Stores detailed motion and activity data for each frame.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| session_id | INTEGER | Foreign key to sessions |
| student_id | INTEGER | Foreign key to students (nullable) |
| track_id | INTEGER | YOLO tracking ID |
| frame | INTEGER | Frame number |
| movement | FLOAT | Pixel movement distance |
| ema | FLOAT | Exponential moving average |
| activity_level | VARCHAR(20) | Active/Inactive |
| timestamp | TIMESTAMP | Record creation time |

#### `activity_graphs`
Stores paths to generated visualization files.

| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| session_id | INTEGER | Foreign key to sessions (unique) |
| ema_plot_path | VARCHAR(500) | Path to EMA plot PNG |
| index_plot_path | VARCHAR(500) | Path to activity index PNG |
| rolling_plot_path | VARCHAR(500) | Path to rolling mean PNG |
| interactive_html_path | VARCHAR(500) | Path to interactive HTML |
| created_at | TIMESTAMP | Record creation time |

---

## API Documentation

### Node.js Backend API (Port 3000)

#### Health Check
```http
GET /api/health
```
**Response:**
```json
{
  "status": "healthy",
  "service": "SwinFace Backend"
}
```

#### Get All Classes
```http
GET /api/classes
```
**Response:**
```json
[
  {
    "id": 1,
    "subject_code": "MTH10013",
    "class_code": "MTH10013_MAY_2025_1",
    "description": "Mathematics - Probability and Statistics",
    "created_at": "2025-01-15T10:00:00Z"
  }
]
```

#### Create Class
```http
POST /api/classes
Content-Type: application/json

{
  "subject_code": "COS30019",
  "class_code": "COS30019_MAY_2025_1",
  "description": "Introduction to AI"
}
```
**Response:** 201 Created
```json
{
  "id": 3,
  "subject_code": "COS30019",
  "class_code": "COS30019_MAY_2025_1",
  "description": "Introduction to AI",
  "created_at": "2025-01-15T10:00:00Z"
}
```

#### Get Sessions
```http
GET /api/sessions?class_id=1
```
**Response:**
```json
[
  {
    "id": 1,
    "class_id": 1,
    "date": "2025-07-15",
    "video_path": "/uploads/video1.mp4",
    "processed_video_path": "/outputs/1/processed_video.mp4",
    "status": "completed",
    "processing_progress": 100,
    "total_students": 18,
    "present_count": 15,
    "absent_count": 3,
    "subject_code": "MTH10013",
    "class_code": "MTH10013_MAY_2025_1"
  }
]
```

#### Get Session Details
```http
GET /api/sessions/1
```
**Response:**
```json
{
  "id": 1,
  "class_id": 1,
  "date": "2025-07-15",
  "status": "completed",
  "attendance": [
    {
      "id": 1,
      "session_id": 1,
      "student_id": 1,
      "name": "Nguyễn Thị Như Anh",
      "student_id": "103823456",
      "status": "Present",
      "confidence": 0.95
    }
  ],
  "graphs": {
    "ema_plot_path": "/outputs/1/motion_plot_ema.png",
    "index_plot_path": "/outputs/1/activity_index.png"
  },
  "activity_summary": [
    {
      "student_id": 1,
      "avg_activity": 2.5,
      "frame_count": 1800
    }
  ]
}
```

#### Upload Video
```http
POST /api/upload-video
Content-Type: multipart/form-data

video: <file>
class_id: 1
session_date: 2025-07-15
```
**Response:**
```json
{
  "job_id": "abc123-def456-ghi789",
  "session_id": 1,
  "status": "processing",
  "message": "Video uploaded successfully. Processing started."
}
```

#### Get Processing Status
```http
GET /api/processing-status/abc123-def456-ghi789
```
**Response:**
```json
{
  "status": "processing",
  "progress": 45,
  "session_id": 1,
  "error": null
}
```

#### Get Students
```http
GET /api/students
```
**Response:**
```json
[
  {
    "id": 1,
    "student_id": "103823456",
    "name": "Nguyễn Thị Như Anh",
    "email": "nhu.anh@example.com",
    "face_embeddings": [...],
    "created_at": "2025-01-15T10:00:00Z"
  }
]
```

#### Create Student
```http
POST /api/students
Content-Type: application/json

{
  "student_id": "103823999",
  "name": "New Student",
  "email": "new.student@example.com"
}
```

#### Register Face
```http
POST /api/register-face
Content-Type: multipart/form-data

face_image: <file>
student_id: 1
```
**Response:**
```json
{
  "message": "Face registered successfully",
  "student_id": 1,
  "student_name": "Nguyễn Thị Như Anh"
}
```

### Python FastAPI Service (Port 8000)

#### Process Video
```http
POST /process-video
Content-Type: multipart/form-data

video_file: <file>
class_id: 1
session_date: 2025-07-15
```

#### Get Processing Status
```http
GET /processing-status/{job_id}
```

#### Register Face
```http
POST /register-face
Content-Type: multipart/form-data

student_id: 1
face_image: <file>
```

---

## Component Breakdown

### Frontend Components

#### `Dashboard.jsx`
- Main dashboard view
- Displays attendance data and analytics
- Integrates VideoUpload component
- Two tabs: Active Learning & Body Active
- Filters by subject, class, and date

#### `Students.jsx`
- Student management interface
- Add new students
- Register student faces
- View face registration status

#### `VideoUpload.jsx`
- Video upload dialog
- Class and date selection
- Progress tracking with polling
- Error handling

#### `SideBar.jsx`
- Navigation menu
- Links to Home, Dashboard, Students, Settings
- Logout functionality

#### `Layout.jsx`
- Main layout wrapper
- Combines SideBar with page content

### Backend Modules

#### `index.js` (Node.js)
- Express server setup
- REST API endpoints
- Database connection (PostgreSQL)
- File upload handling (Multer)
- Proxy requests to Python service

### Python Service Modules

#### `main.py`
- FastAPI application
- API endpoints
- Background task management
- Job status tracking

#### `video_processor.py`
- VideoProcessor class
- YOLO-based face detection and tracking
- Motion analysis with EMA
- Visualization generation
- Database integration

#### `face_recognition.py`
- FaceRecognizer class
- MTCNN face detection
- FaceNet embedding extraction
- Cosine similarity matching
- Face database management

#### `database.py`
- SQLAlchemy engine setup
- Session management
- Database initialization

#### `models.py`
- SQLAlchemy ORM models
- Database table definitions
- Relationships

#### `config.py`
- Configuration management
- Environment variables
- Settings class with defaults

---

## Technology Stack

### Machine Learning & Computer Vision
- **YOLO v11**: Real-time face detection and tracking
- **FaceNet (InceptionResnetV1)**: Face recognition embeddings
- **MTCNN**: Face detection and alignment for FaceNet
- **OpenCV**: Video I/O and image processing
- **PyTorch**: Deep learning framework

### Backend
- **FastAPI**: High-performance Python web framework
- **Express.js**: Node.js web framework
- **SQLAlchemy**: Python ORM
- **Uvicorn**: ASGI server for FastAPI
- **node-pg**: PostgreSQL client for Node.js

### Frontend
- **React 19**: UI library
- **Material-UI (MUI)**: Component library
- **React Router**: Client-side routing
- **Axios**: HTTP client

### Database
- **PostgreSQL**: Relational database
- **JSONB**: For storing face embeddings

### Visualization
- **Matplotlib**: Static plots
- **Plotly**: Interactive visualizations
- **Pandas**: Data manipulation

### DevOps
- **Conda**: Python environment management
- **npm**: Node.js package management
- **Nodemon**: Development auto-reload

---

## Code Organization

### Clean Code Practices Applied

1. **Separation of Concerns**
   - Frontend, backend, and ML service are separate
   - Each module has a single responsibility

2. **Modular Design**
   - Reusable components and functions
   - VideoProcessor, FaceRecognizer are independent classes

3. **Configuration Management**
   - Environment variables for sensitive data
   - Centralized settings in config.py

4. **Error Handling**
   - Try-catch blocks throughout
   - Proper HTTP status codes
   - Meaningful error messages

5. **Database Design**
   - Normalized schema
   - Foreign key constraints
   - Indexes for performance

6. **Documentation**
   - Docstrings for all functions
   - Type hints in Python
   - Comments for complex logic

7. **Naming Conventions**
   - Consistent naming (snake_case for Python, camelCase for JS)
   - Descriptive variable and function names

8. **Code Reusability**
   - Face recognition logic extracted to separate module
   - Video processing logic can be used for different tasks

---

## Future Improvements

### Short Term
1. **Real-time Webcam Processing**
   - WebRTC integration
   - Live activity monitoring
   - Instant alerts

2. **Enhanced Analytics**
   - Attention heatmaps
   - Engagement scoring
   - Comparative analytics across sessions

3. **Export Features**
   - PDF report generation
   - CSV export with filters
   - Excel compatibility

4. **Advanced Search**
   - Filter by activity level
   - Search by student name
   - Date range queries

### Medium Term
1. **Multi-camera Support**
   - Process multiple camera angles
   - 3D tracking visualization
   - Panoramic view

2. **Behavior Analysis**
   - Detect specific actions (raising hand, sleeping)
   - Emotion recognition
   - Engagement patterns

3. **Integration Features**
   - LMS integration (Canvas, Moodle)
   - Calendar sync
   - Email notifications

4. **Mobile App**
   - React Native app
   - Push notifications
   - Offline mode

### Long Term
1. **AI-Powered Insights**
   - Predictive analytics (who might drop out)
   - Personalized recommendations
   - Automated intervention triggers

2. **Privacy & Security**
   - End-to-end encryption
   - GDPR compliance
   - Anonymization options
   - Consent management

3. **Scalability**
   - Microservices architecture
   - Kubernetes deployment
   - Load balancing
   - Caching layer (Redis)

4. **Advanced Features**
   - Speech recognition for participation tracking
   - Slide content analysis
   - Automatic question detection
   - Collaborative learning analytics

### Performance Optimizations
1. **Video Processing**
   - GPU batching
   - Distributed processing
   - Frame sampling optimization
   - Multi-threading

2. **Database**
   - Connection pooling
   - Query optimization
   - Materialized views
   - Partitioning for large datasets

3. **Frontend**
   - Code splitting
   - Lazy loading
   - Service workers
   - Progressive Web App (PWA)

---

## Contributing

### Development Workflow

1. Create a feature branch
2. Implement changes with tests
3. Follow code style guidelines
4. Update documentation
5. Submit pull request

### Code Style

**Python:**
- Follow PEP 8
- Use Black formatter
- Type hints required
- Docstrings for all public functions

**JavaScript:**
- Use ESLint
- Prettier formatter
- JSDoc comments
- Consistent naming

### Testing

Add tests for:
- API endpoints
- Database operations
- Video processing functions
- Face recognition accuracy

---

## Maintenance

### Regular Tasks

1. **Database Backups**
   ```bash
   pg_dump swinface_db > backup_$(date +%Y%m%d).sql
   ```

2. **Log Rotation**
   - Monitor log file sizes
   - Archive old logs
   - Set up logrotate

3. **Model Updates**
   - Check for YOLO updates
   - Retrain on new data if needed
   - Benchmark performance

4. **Dependency Updates**
   ```bash
   npm outdated
   pip list --outdated
   ```

---

## Support & Contact

For technical issues or questions:
- Review this documentation
- Check README.md for setup issues
- Consult API documentation above

**Project Status:** Active Development
**Version:** 1.0.0
**Last Updated:** January 2025

---

**End of Documentation**

