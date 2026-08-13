import React, { useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";

import { fetchConfig } from "../api/client.js";
import { createAppTheme } from "../theme.js";

const DEFAULT_THEME_COLOR = "#0b4dbb";

function getThemeColor(config) {
  return config?.themeColor || config?.logoStyle?.themeColor || DEFAULT_THEME_COLOR;
}

function AppThemeProvider({ children }) {
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);

  useEffect(() => {
    let active = true;

    const handleThemeColorChange = (event) => {
      setThemeColor(event.detail?.themeColor || DEFAULT_THEME_COLOR);
    };

    window.addEventListener("app-theme-color-change", handleThemeColorChange);

    fetchConfig()
      .then((config) => {
        if (active) setThemeColor(getThemeColor(config));
      })
      .catch(() => {
        if (active) setThemeColor(DEFAULT_THEME_COLOR);
      });

    return () => {
      active = false;
      window.removeEventListener(
        "app-theme-color-change",
        handleThemeColorChange,
      );
    };
  }, []);

  const theme = useMemo(() => createAppTheme(themeColor), [themeColor]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--app-theme-color",
      themeColor || DEFAULT_THEME_COLOR,
    );
  }, [themeColor]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

export default AppThemeProvider;
