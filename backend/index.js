/**
 * SwinFace Backend - Node.js Express Server
 * Handles frontend requests and coordinates with Python service
 */

const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const multer = require("multer");
const axios = require("axios");
const morgan = require("morgan");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan("dev")); // Logging

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "swinface_db",
  user: process.env.DB_USER || "swinface_user",
  password: process.env.DB_PASSWORD || "swinface_password",
});

// Test database connection
pool.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("Database connection error:", err);
  } else {
    console.log("Database connected successfully!");
  }
});

// Python service configuration
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || "http://localhost:8000";

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "..", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// Serve static files (outputs, uploads)
app.use("/outputs", express.static(path.join(__dirname, "..", "outputs")));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

const PORT = process.env.PORT || 3000;

// ==================== API ROUTES ====================

/**
 * GET /api/health
 * Health check endpoint
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", service: "SwinFace Backend" });
});

/**
 * GET /api/classes
 * Get all classes
 */
app.get("/api/classes", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM classes ORDER BY subject_code, class_code"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching classes:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

/**
 * POST /api/classes
 * Create a new class
 */
app.post("/api/classes", async (req, res) => {
  const { subject_code, class_code, description } = req.body;

  if (!subject_code || !class_code) {
    return res.status(400).json({ error: "subject_code and class_code are required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO classes (subject_code, class_code, description) VALUES ($1, $2, $3) RETURNING *",
      [subject_code, class_code, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating class:", error);
    if (error.code === "23505") {
      res.status(400).json({ error: "Class already exists" });
    } else {
      res.status(500).json({ error: "Failed to create class" });
    }
  }
});

/**
 * GET /api/sessions
 * Get sessions for a class
 */
app.get("/api/sessions", async (req, res) => {
  const { class_id } = req.query;

  try {
    let query = `
      SELECT s.*, c.subject_code, c.class_code, c.description
      FROM sessions s
      JOIN classes c ON s.class_id = c.id
    `;
    const params = [];

    if (class_id) {
      query += " WHERE s.class_id = $1";
      params.push(class_id);
    }

    query += " ORDER BY s.date DESC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch sessions" });
  }
});

/**
 * GET /api/sessions/:id
 * Get a specific session with all details
 */
app.get("/api/sessions/:id", async (req, res) => {
  const { id } = req.params;

  try {
    // Get session details
    const sessionResult = await pool.query(
      `SELECT s.*, c.subject_code, c.class_code, c.description
       FROM sessions s
       JOIN classes c ON s.class_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: "Session not found" });
    }

    const session = sessionResult.rows[0];

    // Get attendance records
    const attendanceResult = await pool.query(
      `SELECT a.*, st.name, st.student_id, st.email
       FROM attendance a
       JOIN students st ON a.student_id = st.id
       WHERE a.session_id = $1
       ORDER BY st.name`,
      [id]
    );

    // Get activity graphs
    const graphsResult = await pool.query(
      "SELECT * FROM activity_graphs WHERE session_id = $1",
      [id]
    );

    // Get activity summary
    const activityResult = await pool.query(
      `SELECT student_id, AVG(ema) as avg_activity, 
              COUNT(DISTINCT frame) as frame_count
       FROM activity_tracking
       WHERE session_id = $1
       GROUP BY student_id`,
      [id]
    );

    // Combine data
    const response = {
      ...session,
      attendance: attendanceResult.rows,
      graphs: graphsResult.rows[0] || null,
      activity_summary: activityResult.rows,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching session details:", error);
    res.status(500).json({ error: "Failed to fetch session details" });
  }
});

/**
 * GET /api/attendance-data
 * Get all sessions with attendance data (formatted for frontend)
 */
app.get("/api/attendance-data", async (req, res) => {
  try {
    const sessionsResult = await pool.query(`
      SELECT s.*, c.subject_code, c.class_code
      FROM sessions s
      JOIN classes c ON s.class_id = c.id
      WHERE s.status = 'completed'
      ORDER BY s.date DESC
    `);

    const sessions = [];

    for (const session of sessionsResult.rows) {
      // Get attendance
      const attendanceResult = await pool.query(
        `SELECT a.*, st.name as student, st.student_id
         FROM attendance a
         JOIN students st ON a.student_id = st.id
         WHERE a.session_id = $1
         ORDER BY st.name`,
        [session.id]
      );

      // Get activity levels
      const activityResult = await pool.query(
        `SELECT student_id, AVG(ema) as avg_ema
         FROM activity_tracking
         WHERE session_id = $1
         GROUP BY student_id`,
        [session.id]
      );

      const activityMap = {};
      activityResult.rows.forEach((row) => {
        const ema = parseFloat(row.avg_ema);
        let level = "Absent";
        if (ema > 2) level = "High";
        else if (ema > 1) level = "Medium";
        else if (ema > 0) level = "Low";
        activityMap[row.student_id] = level;
      });

      // Get graphs
      const graphsResult = await pool.query(
        "SELECT * FROM activity_graphs WHERE session_id = $1",
        [session.id]
      );

      const graphs = graphsResult.rows[0] || {};

      // Format students data
      const students = attendanceResult.rows.map((att) => ({
        student: att.student,
        status: att.status,
        active: activityMap[att.student_id] || "Absent",
        details: [], // Could be populated with frame snapshots if needed
      }));

      sessions.push({
        subject: session.subject_code,
        class: session.class_code,
        date: new Date(session.date).toLocaleDateString("en-GB"),
        video: session.processed_video_path ? `/outputs/${session.id}/processed_video.mp4` : null,
        graph: [
          {
            ema: graphs.ema_plot_path ? `/outputs/${session.id}/motion_plot_ema.png` : null,
            index: graphs.index_plot_path ? `/outputs/${session.id}/activity_index.png` : null,
          },
        ],
        students,
      });
    }

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching attendance data:", error);
    res.status(500).json({ error: "Failed to fetch attendance data" });
  }
});

/**
 * POST /api/upload-video
 * Upload video and trigger processing via Python service
 */
app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No video file uploaded" });
    }

    const { class_id, session_date } = req.body;

    if (!class_id || !session_date) {
      return res.status(400).json({ error: "class_id and session_date are required" });
    }

    // Forward to Python service
    const formData = new FormData();
    const fileStream = fs.createReadStream(req.file.path);
    formData.append("video_file", fileStream, req.file.originalname);
    formData.append("class_id", class_id);
    formData.append("session_date", session_date);

    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/process-video`,
      formData,
      {
        headers: formData.getHeaders(),
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error uploading video:", error);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: "Failed to upload video" });
    }
  }
});

/**
 * GET /api/processing-status/:job_id
 * Get video processing status from Python service
 */
app.get("/api/processing-status/:job_id", async (req, res) => {
  try {
    const { job_id } = req.params;
    const response = await axios.get(`${PYTHON_SERVICE_URL}/processing-status/${job_id}`);
    res.json(response.data);
  } catch (error) {
    console.error("Error fetching processing status:", error);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: "Failed to fetch processing status" });
    }
  }
});

/**
 * GET /api/students
 * Get all students
 */
app.get("/api/students", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM students ORDER BY name");
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

/**
 * POST /api/students
 * Create a new student
 */
app.post("/api/students", async (req, res) => {
  const { student_id, name, email } = req.body;

  if (!student_id || !name) {
    return res.status(400).json({ error: "student_id and name are required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO students (student_id, name, email) VALUES ($1, $2, $3) RETURNING *",
      [student_id, name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating student:", error);
    if (error.code === "23505") {
      res.status(400).json({ error: "Student ID already exists" });
    } else {
      res.status(500).json({ error: "Failed to create student" });
    }
  }
});

/**
 * POST /api/register-face
 * Register a face for a student (proxy to Python service)
 */
app.post("/api/register-face", upload.single("face_image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file uploaded" });
    }

    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({ error: "student_id is required" });
    }

    // Forward to Python service
    const formData = new FormData();
    const fileStream = fs.createReadStream(req.file.path);
    formData.append("face_image", fileStream, req.file.originalname);
    formData.append("student_id", student_id);

    const response = await axios.post(
      `${PYTHON_SERVICE_URL}/register-face`,
      formData,
      {
        headers: formData.getHeaders(),
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error("Error registering face:", error);
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ error: "Failed to register face" });
    }
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`SwinFace Backend running at http://localhost:${PORT}`);
});

