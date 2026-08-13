import { createTheme } from "@mui/material/styles";

export function createAppTheme(primaryColor = "#0b4dbb") {
  return createTheme({
    palette: {
      primary: {
        main: primaryColor || "#0b4dbb",
      },
      secondary: {
        main: "#21b14b",
      },
    },
    shape: {
      borderRadius: 18,
    },
    typography: {
      fontFamily: ["Segoe UI", "Roboto", "Arial", "sans-serif"].join(","),
    },
  });
}

const theme = createAppTheme();

export default theme;
