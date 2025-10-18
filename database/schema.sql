-- SwinFace Database Schema
-- PostgreSQL Database for Attendance and Activity Tracking System

-- Drop existing tables if they exist (for fresh setup)
DROP TABLE IF EXISTS activity_graphs CASCADE;
DROP TABLE IF EXISTS activity_tracking CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS students CASCADE;

-- Students table: Store student information and face embeddings
CREATE TABLE students (
    id SERIAL PRIMARY KEY,
    student_id VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    face_embeddings JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classes table: Store class/subject information
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    subject_code VARCHAR(50) NOT NULL,
    class_code VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(subject_code, class_code)
);

-- Sessions table: Store class session information
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    video_path VARCHAR(500),
    processed_video_path VARCHAR(500),
    status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    processing_progress INTEGER DEFAULT 0,
    total_students INTEGER DEFAULT 0,
    present_count INTEGER DEFAULT 0,
    absent_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id, date)
);

-- Attendance table: Store student attendance for each session
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL, -- Present, Absent
    confidence FLOAT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, student_id)
);

-- Activity tracking table: Store detailed motion and activity data
CREATE TABLE activity_tracking (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES students(id),
    track_id INTEGER NOT NULL,
    frame INTEGER NOT NULL,
    movement FLOAT NOT NULL,
    ema FLOAT NOT NULL,
    activity_level VARCHAR(20), -- Active, Inactive
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity graphs table: Store paths to generated visualization files
CREATE TABLE activity_graphs (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
    ema_plot_path VARCHAR(500),
    index_plot_path VARCHAR(500),
    rolling_plot_path VARCHAR(500),
    interactive_html_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_attendance_session ON attendance(session_id);
CREATE INDEX idx_attendance_student ON attendance(student_id);
CREATE INDEX idx_activity_tracking_session ON activity_tracking(session_id);
CREATE INDEX idx_activity_tracking_student ON activity_tracking(student_id);
CREATE INDEX idx_sessions_class ON sessions(class_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_status ON sessions(status);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing
INSERT INTO students (student_id, name, email) VALUES
    ('103823456', 'Nguyễn Thị Như Anh', 'nhu.anh@example.com'),
    ('103823457', 'Đỗ Tùng Dương', 'tung.duong@example.com'),
    ('103823458', 'Lê Đức Thành', 'duc.thanh@example.com'),
    ('103823459', 'Bùi Minh Thuận', 'minh.thuan@example.com'),
    ('103823460', 'Đặng Minh Quang', 'minh.quang@example.com'),
    ('103823461', 'Nguyễn Nam Anh', 'nam.anh@example.com'),
    ('103823462', 'Nguyễn Thiên Ân', 'thien.an@example.com'),
    ('103823463', 'Bùi Minh Hiếu', 'minh.hieu@example.com'),
    ('103823464', 'Đậu Vũ Tuấn Khôi', 'tuan.khoi@example.com'),
    ('103823465', 'Dư Nguyễn Đình Khang', 'dinh.khang@example.com'),
    ('103823466', 'Hoàng Hữu Hoan', 'huu.hoan@example.com'),
    ('103823467', 'Lâm Tuấn Việt', 'tuan.viet@example.com'),
    ('103823468', 'Nguyễn Trọng Quý', 'trong.quy@example.com'),
    ('103823469', 'Phạm Hồ Quang Dũng', 'quang.dung@example.com'),
    ('103823470', 'Phạm Tiến Đạt', 'tien.dat@example.com'),
    ('103823471', 'Trịnh Nhân Kiệt', 'nhan.kiet@example.com'),
    ('103823472', 'Vũ Minh An', 'minh.an@example.com'),
    ('103823473', 'Phạm Minh Hiếu', 'pham.minh.hieu@example.com');

INSERT INTO classes (subject_code, class_code, description) VALUES
    ('MTH10013', 'MTH10013_MAY_2025_1', 'Mathematics - Probability and Statistics'),
    ('COS10004', 'COS10004_MAY_2025_1', 'Computer Systems');

-- Database setup complete

