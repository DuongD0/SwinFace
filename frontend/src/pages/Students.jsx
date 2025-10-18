import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton,
  Alert,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import axios from "axios";

const Students = () => {
  const [students, setStudents] = useState([]);
  const [openAddStudent, setOpenAddStudent] = useState(false);
  const [openRegisterFace, setOpenRegisterFace] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [newStudent, setNewStudent] = useState({
    student_id: "",
    name: "",
    email: "",
  });
  const [selectedImage, setSelectedImage] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get("http://localhost:3000/api/students");
      setStudents(response.data);
    } catch (err) {
      console.error("Error fetching students:", err);
      setError("Failed to fetch students");
    }
  };

  const handleAddStudent = async () => {
    if (!newStudent.student_id || !newStudent.name) {
      setError("Student ID and Name are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await axios.post("http://localhost:3000/api/students", newStudent);
      setSuccess("Student added successfully!");
      setOpenAddStudent(false);
      setNewStudent({ student_id: "", name: "", email: "" });
      fetchStudents();
    } catch (err) {
      console.error("Error adding student:", err);
      setError(err.response?.data?.error || "Failed to add student");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterFace = async () => {
    if (!selectedImage || !selectedStudent) {
      setError("Please select an image");
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("face_image", selectedImage);
    formData.append("student_id", selectedStudent.id);

    try {
      await axios.post("http://localhost:3000/api/register-face", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      setSuccess("Face registered successfully!");
      setOpenRegisterFace(false);
      setSelectedImage(null);
      setSelectedStudent(null);
      fetchStudents();
    } catch (err) {
      console.error("Error registering face:", err);
      setError(err.response?.data?.error || "Failed to register face");
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      setError(null);
    } else {
      setError("Please select a valid image file");
      setSelectedImage(null);
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <Box
        sx={{
          backgroundColor: "white",
          borderRadius: 2,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          p: 3,
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4">Student Management</Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenAddStudent(true)}
            sx={{ backgroundColor: "#da1a32" }}
          >
            Add Student
          </Button>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" onClose={() => setSuccess(null)} sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Paper>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: "#000000" }}>
                <TableCell sx={{ color: "#ffffff" }}>Student ID</TableCell>
                <TableCell sx={{ color: "#ffffff" }}>Name</TableCell>
                <TableCell sx={{ color: "#ffffff" }}>Email</TableCell>
                <TableCell sx={{ color: "#ffffff" }}>Face Registered</TableCell>
                <TableCell sx={{ color: "#ffffff" }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>{student.student_id}</TableCell>
                  <TableCell>{student.name}</TableCell>
                  <TableCell>{student.email || "-"}</TableCell>
                  <TableCell>
                    {student.has_face_registered || student.face_embeddings ? (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label="Registered"
                        color="success"
                        size="small"
                      />
                    ) : (
                      <Chip label="Not Registered" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell>
                    <IconButton
                      color="primary"
                      onClick={() => {
                        setSelectedStudent(student);
                        setOpenRegisterFace(true);
                      }}
                      title="Register Face"
                    >
                      <PhotoCameraIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      </Box>

      {/* Add Student Dialog */}
      <Dialog open={openAddStudent} onClose={() => !loading && setOpenAddStudent(false)}>
        <DialogTitle>Add New Student</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Student ID"
            value={newStudent.student_id}
            onChange={(e) =>
              setNewStudent({ ...newStudent, student_id: e.target.value })
            }
            sx={{ mt: 2, mb: 2 }}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Name"
            value={newStudent.name}
            onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
            sx={{ mb: 2 }}
            disabled={loading}
          />
          <TextField
            fullWidth
            label="Email (Optional)"
            type="email"
            value={newStudent.email}
            onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
            disabled={loading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAddStudent(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleAddStudent}
            variant="contained"
            disabled={loading}
            sx={{ backgroundColor: "#da1a32" }}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Register Face Dialog */}
      <Dialog
        open={openRegisterFace}
        onClose={() => !loading && setOpenRegisterFace(false)}
      >
        <DialogTitle>
          Register Face for {selectedStudent?.name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Upload a clear, frontal photo of the student's face
          </Typography>
          <Button variant="outlined" component="label" fullWidth disabled={loading}>
            {selectedImage ? selectedImage.name : "Choose Image"}
            <input type="file" hidden accept="image/*" onChange={handleImageChange} />
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRegisterFace(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleRegisterFace}
            variant="contained"
            disabled={loading || !selectedImage}
            sx={{ backgroundColor: "#da1a32" }}
          >
            Register
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Students;

