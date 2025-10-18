# Intelligent Attendance and Activity Monitoring System
## Features

- **Automated Video Processing**: Upload classroom videos for automated face detection and tracking
- **Face Recognition**: Identify students using FaceNet embeddings and YOLO face detection
- **Motion Analysis**: Track student movement and calculate activity levels using EMA smoothing
- **Visual Analytics**: Generate comprehensive charts showing movement patterns and activity indices
- **Real-time Processing**: Monitor processing status with progress updates
- **PostgreSQL Database**: Persist all attendance and activity data
- **Modern UI**: Beautiful Material-UI interface with responsive design
- **Student Management**: Register students and their face profiles

## Technology Stack

### Backend
- **Python FastAPI**: High-performance API for video processing
- **Node.js + Express**: Backend server for frontend coordination
- **PostgreSQL**: Relational database for data persistence

### Machine Learning
- **YOLOv11**: Face detection and tracking
- **FaceNet (InceptionResnetV1)**: Face recognition embeddings
- **OpenCV**: Video processing and manipulation
- **PyTorch**: Deep learning framework

### Frontend
- **React 19**: Modern UI library
- **Material-UI**: Component library
- **Axios**: HTTP client
- **React Router**: Navigation

### Visualization
- **Matplotlib**: Static plots
- **Plotly**: Interactive visualizations
- **Pandas**: Data analysis

## Architecture

```
SwinFace/
├── frontend/           # React frontend application
├── backend/            # Node.js Express server
├── python-service/     # Python FastAPI video processing service
├── database/           # PostgreSQL schema and setup scripts
├── uploads/            # Uploaded video files
├── outputs/            # Processed videos and analytics
├── known_faces/        # Student face database
├── models/             # YOLO model files
└── environment.yml     # Conda environment specification
```

## Prerequisites

- **Node.js**: v18 or higher
- **Python**: 3.10
- **PostgreSQL**: 13 or higher
- **Conda**: For Python environment management
- **CUDA** (Optional): For GPU acceleration

## Installation

### 1. Clone or Navigate to Project

```bash
cd /home/d0/projects/SwinFace
```

### 2. Setup Python Environment

Create and activate the Conda environment:

```bash
conda env create -f environment.yml
conda activate SwinFaceMotion
```

### 3. Setup PostgreSQL Database

Install PostgreSQL (if not already installed):

```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
```

Run the database setup script:

```bash
cd database
chmod +x setup.sh
./setup.sh
```

Or manually create the database:

```bash
sudo -u postgres psql
CREATE DATABASE swinface_db;
CREATE USER swinface_user WITH PASSWORD 'swinface_password';
GRANT ALL PRIVILEGES ON DATABASE swinface_db TO swinface_user;
\q

# Run schema
psql -U swinface_user -d swinface_db -f schema.sql
```

### 4. Setup Backend (Node.js)

```bash
cd backend
npm install
```

Create `.env` file in `backend/` directory:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=swinface_db
DB_USER=swinface_user
DB_PASSWORD=swinface_password
PORT=3000
PYTHON_SERVICE_URL=http://localhost:8000
```

### 5. Setup Python Service

```bash
cd python-service
```

Create `.env` file in `python-service/` directory:

```env
DATABASE_URL=postgresql://swinface_user:swinface_password@localhost:5432/swinface_db
HOST=0.0.0.0
PORT=8000
DEVICE=cuda
```

Note: Set `DEVICE=cpu` if you don't have a CUDA-capable GPU.

### 6. Setup Frontend

```bash
cd frontend
npm install
```

## Running the Application

You need to run three services simultaneously. Open three terminal windows:

### Terminal 1: Python Service

```bash
conda activate SwinFaceMotion
cd python-service
python main.py
```

The Python service will start on `http://localhost:8000`

### Terminal 2: Node.js Backend

```bash
cd backend
npm start
```

The backend will start on `http://localhost:3000`

### Terminal 3: Frontend

```bash
cd frontend
npm run dev
```

The frontend will start on `http://localhost:5173`

## Usage

### 1. Access the Application

Open your browser and navigate to `http://localhost:5173`

### 2. Register Students

1. Navigate to **Students** page from the sidebar
2. Click **Add Student** button
3. Fill in student details (ID, Name, Email)
4. Click the camera icon to register student's face
5. Upload a clear frontal photo of the student

### 3. Upload and Process Videos

1. Navigate to **Dashboard** page
2. Click **Upload Video** button
3. Select the class/subject
4. Choose the session date
5. Upload the classroom video
6. Wait for processing to complete (progress bar will show status)

### 4. View Results

Once processing is complete:

- **Active Learning Tab**: View attendance table with activity levels
  - Green: Present students
  - Red: Absent students
  - Activity levels: High, Medium, Low

- **Body Active Tab**: View motion analysis
  - EMA plot showing movement over time
  - Activity index bar chart
  - Processed video with bounding boxes

### 5. Create Classes (Optional)

If you need to add new classes:

```bash
curl -X POST http://localhost:3000/api/classes \
  -H "Content-Type: application/json" \
  -d '{
    "subject_code": "COS30019",
    "class_code": "COS30019_MAY_2025_1",
    "description": "Introduction to AI"
  }'
```

## API Endpoints

### Backend (Node.js) - Port 3000

- `GET /api/health` - Health check
- `GET /api/classes` - List all classes
- `POST /api/classes` - Create new class
- `GET /api/sessions` - List sessions
- `GET /api/sessions/:id` - Get session details
- `GET /api/attendance-data` - Get all attendance data
- `POST /api/upload-video` - Upload video for processing
- `GET /api/processing-status/:job_id` - Check processing status
- `GET /api/students` - List all students
- `POST /api/students` - Create new student
- `POST /api/register-face` - Register student face

### Python Service - Port 8000

- `GET /` - Health check
- `POST /process-video` - Process uploaded video
- `GET /processing-status/{job_id}` - Get processing status
- `POST /register-face` - Register face with embeddings
- `GET /students` - Get students list
- `POST /students` - Create new student

Full API documentation: See `DOCUMENTATION.md`

## Motion Analysis

The system uses **Exponential Moving Average (EMA)** to smooth motion data:

```
EMA(t) = α × Movement(t) + (1 - α) × EMA(t-1)
```

Where:
- α (alpha) = 0.2 (smoothing factor)
- Movement = Euclidean distance between consecutive face positions

**Activity Threshold**: 1.0 pixel movement
- **Active**: EMA > 1.0 (Green bounding box)
- **Inactive**: EMA ≤ 1.0 (Red bounding box)


## Development

### Running in Development Mode

Backend with hot reload:
```bash
cd backend
npm run dev
```

Python with auto-reload:
```bash
cd python-service
uvicorn main:app --reload --port 8000
```

Frontend with hot reload:
```bash
cd frontend
npm run dev
```

**Built using YOLOv11, FaceNet, React, and FastAPI**

