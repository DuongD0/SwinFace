import { Drawer, List, ListItemButton, ListItemIcon, ListItemText, Toolbar, Box } from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const menuItems = [
  { text: 'Home', icon: <HomeIcon />, path: '/' },
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Students', icon: <PeopleIcon />, path: '/students' },
  { text: 'Settings', icon: <SettingsIcon />, path: '/settings' },
];

const SideBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    // Here you can clear token or authentication state
    console.log("Logged out");
    navigate('/signin');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{ width: 240, [`& .MuiDrawer-paper`]: { width: 240, boxSizing: 'border-box' } }}
    >
      <Toolbar>
        <img src="logo-swinburne.svg" alt="Logo" style={{ width: '50%', objectFit: 'contain' }} />
      </Toolbar>
      <List sx={{ flexGrow: 1}}>
        {menuItems.map((item) => (
          <ListItemButton
            key={item.text}
            component={Link}
            to={item.path}
            selected={location.pathname === item.path}
            sx={{
              borderRadius: 2,
              marginX: 1,
              marginY: 0.5,
              "&:hover": {
                backgroundColor: "#da1a3220",
              },
              "&.Mui-selected": {
                backgroundColor: "#da1a32",
                "&:hover": {
                  backgroundColor: "#da1a32",
                },
                // Select the icon inside this selected button
                "& .MuiListItemIcon-root": {
                  color: "#ffffff",
                },
                // Select the text inside this selected button
                "& .MuiListItemText-root": {
                  color: "#ffffff",
                },
              },
            }}
          >
            <ListItemIcon sx={{ color: "#da1a32" }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItemButton>

        ))}
      </List>

      {/* Logout button at the bottom */}
      <Box sx={{ mt: "auto", mb: 2 }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            marginX: 1,
            "&:hover": {
              backgroundColor: "#fdecea",
            },
          }}
        >
          <ListItemIcon sx={{ color: "#da1a32" }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" sx={{ color: "#000000" }} />
        </ListItemButton>
      </Box>
    </Drawer>
  );
};

export default SideBar;
