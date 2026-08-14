import React, { useEffect, useMemo, useState } from "react";
import { CssBaseline, ThemeProvider } from "@mui/material";

import { fetchConfig } from "../api/client.js";
import { createAppTheme } from "../theme.js";
import { normalizeAssetUrl } from "../utils/assetUrl.js";

const DEFAULT_THEME_COLOR = "#0b4dbb";
const DEFAULT_APP_META = {
  title: "Robot Control Demo",
  faviconUrl: "/vite.svg",
};

function getThemeColor(config) {
  return config?.themeColor || config?.logoStyle?.themeColor || DEFAULT_THEME_COLOR;
}

function applyAppMeta(meta = DEFAULT_APP_META) {
  const title = String(meta.title || DEFAULT_APP_META.title).trim();
  const faviconUrl = normalizeAssetUrl(
    meta.faviconUrl,
    DEFAULT_APP_META.faviconUrl,
  );

  document.title = title;

  let favicon = document.querySelector('link[rel="icon"]');
  if (!favicon) {
    favicon = document.createElement("link");
    favicon.rel = "icon";
    document.head.appendChild(favicon);
  }

  favicon.href = faviconUrl;
  favicon.type = faviconUrl.endsWith(".svg") ? "image/svg+xml" : "image/png";
}

function AppThemeProvider({ children }) {
  const [themeColor, setThemeColor] = useState(DEFAULT_THEME_COLOR);

  useEffect(() => {
    let active = true;

    const handleThemeColorChange = (event) => {
      setThemeColor(event.detail?.themeColor || DEFAULT_THEME_COLOR);
      if (event.detail?.appMeta) {
        applyAppMeta(event.detail.appMeta);
      }
    };

    window.addEventListener("app-theme-color-change", handleThemeColorChange);

    fetchConfig()
      .then((config) => {
        if (!active) return;
        setThemeColor(getThemeColor(config));
        applyAppMeta(config?.appMeta || DEFAULT_APP_META);
      })
      .catch(() => {
        if (!active) return;
        setThemeColor(DEFAULT_THEME_COLOR);
        applyAppMeta(DEFAULT_APP_META);
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
