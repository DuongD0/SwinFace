import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  LinearProgress,
  Typography,
  Alert,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import axios from "axios";

const VideoUpload = ({ classes, onUploadComplete }) => {
  const [open, setOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedClass, setSelectedClass] = useState("");
  const [sessionDate, setSessionDate] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("video/")) {
      setSelectedFile(file);
      setError(null);
    } else {
      setError("Please select a valid video file");
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedClass || !sessionDate) {
      setError("Please fill in all fields");
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("video", selectedFile);
    formData.append("class_id", selectedClass);
    formData.append("session_date", sessionDate);

    try {
      const response = await axios.post(
        "http://localhost:3000/api/upload-video",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
        }
      );

      setJobId(response.data.job_id);

      // Poll for processing status
      pollProcessingStatus(response.data.job_id);
    } catch (err) {
      console.error("Upload error:", err);
      setError(err.response?.data?.error || "Failed to upload video");
      setUploading(false);
    }
  };

  const pollProcessingStatus = async (jobId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await axios.get(
          `http://localhost:3000/api/processing-status/${jobId}`
        );

        setProgress(response.data.progress);

        if (response.data.status === "completed") {
          clearInterval(pollInterval);
          setUploading(false);
          setOpen(false);
          if (onUploadComplete) {
            onUploadComplete();
          }
          // Reset form
          setSelectedFile(null);
          setSelectedClass("");
          setSessionDate("");
          setJobId(null);
        } else if (response.data.status === "failed") {
          clearInterval(pollInterval);
          setError(response.data.error || "Processing failed");
          setUploading(false);
        }
      } catch (err) {
        console.error("Error polling status:", err);
      }
    }, 2000); // Poll every 2 seconds
  };

  const handleClose = () => {
    if (!uploading) {
      setOpen(false);
      setSelectedFile(null);
      setSelectedClass("");
      setSessionDate("");
      setError(null);
      setProgress(0);
    }
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<CloudUploadIcon />}
        onClick={() => setOpen(true)}
        sx={{ backgroundColor: "#da1a32" }}
      >
        Upload Video
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Upload Class Session Video</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>Select Class</InputLabel>
            <Select
              value={selectedClass}
              label="Select Class"
              onChange={(e) => setSelectedClass(e.target.value)}
              disabled={uploading}
            >
              {classes.map((cls) => (
                <MenuItem key={cls.id} value={cls.id}>
                  {cls.subject_code} - {cls.class_code}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            label="Session Date"
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
            disabled={uploading}
          />

          <Button
            variant="outlined"
            component="label"
            fullWidth
            disabled={uploading}
            sx={{ mb: 2 }}
          >
            {selectedFile ? selectedFile.name : "Choose Video File"}
            <input type="file" hidden accept="video/*" onChange={handleFileChange} />
          </Button>

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                {jobId ? "Processing video..." : "Uploading..."}
              </Typography>
              <LinearProgress variant="determinate" value={progress} />
              <Typography variant="caption" sx={{ mt: 1 }}>
                {progress}%
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={uploading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            variant="contained"
            disabled={uploading || !selectedFile || !selectedClass || !sessionDate}
            sx={{ backgroundColor: "#da1a32" }}
          >
            Upload & Process
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default VideoUpload;

