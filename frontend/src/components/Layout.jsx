import { Box, Toolbar, Avatar, IconButton, Badge, Typography, InputBase, Paper, TextField } from "@mui/material";
import NotificationsIcon from "@mui/icons-material/Notifications";
import SearchIcon from "@mui/icons-material/Search";
import SideBar from "./SideBar";
import { Outlet, useLocation } from "react-router-dom";

const Layout = () => {
  const location = useLocation();

  // Get page title from current path (optional, customize as you like)
  const pageTitle = location.pathname === "/dashboard" ? "Dashboard" : "Page";

  // Get current date in formatted text
  const getCurrentDate = () => {
    const now = new Date();
    const options = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    };
    return now.toLocaleDateString('en-US', options);
  };

  return (
    <Box sx={{ display: "flex", backgroundColor: "#f5f5f5", minHeight: "100vh" }}>
      <SideBar />
      <Box component="main" sx={{ flexGrow: 1, p: 3, pr: 10 }}>  {/* <-- Add more right padding */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          {/* Left title */}
          <Box>
            <Typography variant="h5" fontWeight="bold">{pageTitle}</Typography>
            <Typography variant="body2" color="textSecondary">{getCurrentDate()}</Typography>
          </Box>

          {/* Right actions */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Paper
              component="form"
              sx={{
                p: "2px 8px",
                display: "flex",
                alignItems: "center",
                width: 200,
                borderRadius: 4,
                mr: 2,
                boxShadow: "none",
                backgroundColor: "#da1a3220",
              }}
            >
              <SearchIcon sx={{ mr: 1, color: "#000000" }} />
              <InputBase placeholder="Search..." sx={{ flex: 1 }} />
            </Paper>

            <IconButton>
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            <Avatar alt="John Smith" src="https://via.placeholder.com/40" sx={{ ml: 2, backgroundColor: "#000000" }} />
          </Box>
        </Box>

        <Toolbar sx={{ minHeight: "5px !important", p: 0 }} />

        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
