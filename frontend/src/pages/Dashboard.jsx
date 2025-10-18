import {
  Box,
  Typography,
  Select,
  MenuItem,
  Grid,
  Paper,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  Card,
  CardMedia,
  CardContent,
  IconButton,
  Button,
  TextField,
  Checkbox,
  Tab,
  Tabs,
  Pagination,
} from "@mui/material";
import { useEffect, useState } from "react";
import axios from "axios";
import CloseIcon from "@mui/icons-material/Close";
import FilterListIcon from "@mui/icons-material/FilterList";
import VideoUpload from "../components/VideoUpload";

const Dashboard = () => {
  const [allSessions, setAllSessions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [filteredSession, setFilteredSession] = useState(null);
  const [tabValue, setTabValue] = useState(0);

  const fetchData = () => {
    axios.get("http://localhost:3000/api/attendance-data").then((res) => {
      setAllSessions(res.data);
    });
    axios.get("http://localhost:3000/api/classes").then((res) => {
      setClasses(res.data);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedSubject && selectedClass && selectedDate) {
      const found = allSessions.find(
        (s) =>
          s.subject === selectedSubject &&
          s.class === selectedClass &&
          s.date === selectedDate
      );
      setFilteredSession(found || null);
    }
  }, [selectedSubject, selectedClass, selectedDate, allSessions]);

  const subjectOptions = [...new Set(allSessions.map((s) => s.subject))];
  const classOptions = [...new Set(allSessions.filter((s) => s.subject === selectedSubject).map((s) => s.class))];
  const dateOptions = [...new Set(allSessions.filter((s) => s.class === selectedClass).map((s) => s.date))];

  const present = filteredSession?.students.filter((d) => d.status === "Present").length || 0;
  const absent = filteredSession?.students.filter((d) => d.status === "Absent").length || 0;

  return (
    
    <Box sx={{ backgroundColor: "#f5f5f5", minHeight: "100vh", width: "100%", p: 3 }}>
      <Box sx={{
          backgroundColor: "white",
          borderRadius: 2,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          padding: "10px",
        }}>
        {/* Filter */}
        <Grid container spacing={2} mb={4}>
          <Grid item xs={4}>
            <Select fullWidth value={selectedSubject} onChange={(e) => {
              setSelectedSubject(e.target.value);
              setSelectedClass("");
              setSelectedDate("");}}
              displayEmpty
              renderValue={(selected) =>selected ? selected : "Select Subject"}
              sx={{
              backgroundColor: "#da1a3220",
              borderRadius: 2,
              width: "250px", // fixed width
              "& .MuiSelect-select": {
                padding: "10px",
              },
              }}>
              <MenuItem value="">Select Subject</MenuItem>
              {subjectOptions.map((subj, idx) => (
                <MenuItem key={idx} value={subj}>{subj}</MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={4}>
            <Select fullWidth value={selectedClass} onChange={(e) => {
              setSelectedClass(e.target.value);
              setSelectedDate("");
            }}
            displayEmpty
            renderValue={(selected) =>selected ? selected : "Select Class"}
            sx={{
              backgroundColor: "#da1a3220",
              borderRadius: 2,
              width: "250px", // fixed width
              "& .MuiSelect-select": {
                padding: "10px",
              },
              }}
            >
              <MenuItem value="">Select Class</MenuItem>
              {classOptions.map((cls, idx) => (
                <MenuItem key={idx} value={cls}>{cls}</MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={4}>
            <Select fullWidth value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
              displayEmpty
            renderValue={(selected) =>selected ? selected : "Select Date"}
            sx={{
              backgroundColor: "#da1a3220",
              borderRadius: 2,
              width: "250px", // fixed width
              "& .MuiSelect-select": {
                padding: "10px",
              },
              }}>
              <MenuItem value="">Select Date</MenuItem>
              {dateOptions.map((d, idx) => (
                <MenuItem key={idx} value={d}>{d}</MenuItem>
              ))}
            </Select>
          </Grid>

          <TextField
          placeholder="Search..."
          variant="outlined"
          size="small"
          sx={{
            backgroundColor: "#f5f5f5",
            borderRadius: 2,
            width: "200px",
            "& fieldset": {
              borderRadius: 2,
            },
          }}
          />

          <Box display="flex" alignItems="center" gap={2}>
            <VideoUpload classes={classes} onUploadComplete={fetchData} />
            <FilterListIcon sx={{ color: "#da1a32", cursor: "pointer" }} />
            <Button variant="contained" color="primary" sx={{backgroundColor: "#da1a32"}}>
              Export
            </Button>
          </Box>

        </Grid>

        {/* Video
        {filteredSession?.video && (
          <Box mb={4}>
            <Typography variant="h6" mb={1} >Session Recording ({filteredSession.date})</Typography>
            <Box display="flex" justifyContent="center">
              <video
                width="80%"
                controls
                style={{
                  borderRadius: 8,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                }}
              >
                <source src={filteredSession.video} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </Box>
          </Box>
        )} */}

        <Box sx={{ mt: 2, bgcolor: "white", borderRadius: 2 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          textColor="primary"
          indicatorColor="secondary"
          
        >
          <Tab label="Active Learning" 
           sx={{
               "&.Mui-selected": {color: "#000000", indicatorColor: "#da1a32"},
               }}
          />
          <Tab label="Body Active" 
            sx={{
                "&.Mui-selected": {color: "#000000", indicatorColor: "#da1a32"},
                }}
          />
        </Tabs>
      </Box>

      {tabValue === 0 && (
        <>
            {/* Summary */}
          {filteredSession && (
            <Grid container spacing={10} textAlign="center" mb={4} justifyContent="center" >
              <Grid item xs={4}>
                <Typography variant="h6">Total</Typography>
                <Typography variant="h3">{filteredSession.students.length}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="h6">Present</Typography>
                <Typography variant="h3">{present}</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="h6">Absent</Typography>
                <Typography variant="h3">{absent}</Typography>
              </Grid>
            </Grid>
          )}

          {/* Table */}
          {filteredSession && (
            <Paper>
              <Table>
                <TableHead className='table-header'>
                  <TableRow sx={{backgroundColor: "#000000"}}>
                    <TableCell padding="checkbox">
                      <Checkbox sx={{color: "#ffffff", "&.Mui-checked": {color:"#da1a32"}}}/>
                    </TableCell>
                    <TableCell sx={{color: "#ffffff"}}>Date</TableCell>
                    <TableCell sx={{color: "#ffffff"}}>Student</TableCell>
                    <TableCell sx={{color: "#ffffff"}}>Attendance</TableCell>
                    <TableCell sx={{color: "#ffffff"}}>Active Level</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSession.students.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell padding="checkbox">
                        <Checkbox sx={{"&.Mui-checked": {color:"#da1a32"}}}/>
                      </TableCell>

                      <TableCell>{filteredSession.date}</TableCell>
                      <TableCell>{row.student}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center">
                          <Box
                            sx={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              backgroundColor: row.status === "Present" ? "green" : "red",
                              mr: 1,
                            }}
                          />
                          <Typography>{row.status}</Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={row.active}
                          sx={{
                            cursor: "pointer",
                            backgroundColor:
                              row.active === "High" ? "#C8E6C9" :
                              row.active === "Medium" ? "#FFECB3" :
                              row.active === "Low" ? "#FFCC80" :
                              row.active === "Absent" ? "#EF9A9A" :
                              "#E0E0E0",
                            color: "#000",
                            width: 100, 
                            justifyContent: 'center',
                          }}
                          onClick={() => {
                            if (row.details?.length > 0) {
                              setSelectedStudent(row);
                            }
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {/* <Box display="flex" justifyContent="center" my={2}>
                <Pagination count={5} color="secondary"/>
              </Box> */}
            </Paper>
          )}

          {/* Popup active detail */}
          <Dialog open={Boolean(selectedStudent)} onClose={() => setSelectedStudent(null)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {selectedStudent?.student}
              <IconButton onClick={() => setSelectedStudent(null)} edge="end">
                <CloseIcon />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Grid container spacing={3} justifyContent="center" alignItems="center">
                {selectedStudent?.details?.map((d, idx) => (
                  <Grid item xs={12} sm={4} key={idx}>
                    <Card>
                      <CardMedia component="img" height="160" image={d.img} alt={d.action} />
                      <CardContent>
                        <Typography variant="body2">{d.action}</Typography>
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color={d.active ? "green" : "red"}
                        >
                          {d.active ? "Active" : "Inactive"}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </DialogContent>
          </Dialog>
          
        </>
      )}

      {tabValue === 1 && filteredSession && (
        <>
          <Box display="flex" gap={10} mt={2} justifyContent="center">
            <Box
              sx={{
                width: "45%",
                backgroundColor: "white",
                borderRadius: 2,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}
            >
              <Typography variant="h6" p={2}>
                Movement Activity
              </Typography>
              <Box
                component="img"
                src={filteredSession.graph?.[0]?.ema || "/motion_plot_ema.png"}
                alt="Movement Activity Graph"
                sx={{ width: "100%", height: "auto" }}
              />
            </Box>

            <Box
              sx={{
                width: "45%",
                backgroundColor: "white",
                borderRadius: 2,
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                overflow: "hidden",
              }}
            >
              <Typography variant="h6" p={2}>
                Activity Index
              </Typography>
              <Box
                component="img"
                src={filteredSession.graph?.[0]?.index || "/activity_index.png"}
                alt="Activity Index Graph"
                sx={{ width: "100%", height: "auto" }}
              />
            </Box>
          </Box>

          {/* Video under images */}
          {filteredSession?.video && (
            <Box mb={4}  mt={6} display="flex" flexDirection="column" alignItems="center">
              <Typography variant="h6" mb={1} align="center">
                Class {filteredSession.class}: {filteredSession.date}
              </Typography>
              <video
                width="100%"
                controls
                style={{ borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
              >
                <source src={filteredSession.video} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </Box>
          )}
        </>
      )}
      </Box>
    </Box>
  );
};

export default Dashboard;