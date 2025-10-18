import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  typography: {
    fontFamily: "Poppins, sans-serif",
  },
  palette: {
    secondary: {
      main: "#da1a32", // Optional secondary color
    },
  },
});

export default theme;
