import React, { useEffect, useState } from "react";
import { Box, IconButton, useMediaQuery } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HomeIcon from "@mui/icons-material/Home";
import logo100Pro from "../../public/assets/logo 100Pro.png";
import { fetchConfig } from "../api/client.js";

const DEFAULT_LOGO_STYLE = {
  logoUrl: logo100Pro,
  objectPositionX: 50,
  objectPositionY: 50,
};

function ScreenLayout({
  title,
  onBack,
  onHome,
  children,
  showBack = true,
  showLogo = true,
  showBackground = true, // เพิ่ม
}) {
  const isPortrait = useMediaQuery("(orientation: portrait)");
  const [logoStyle, setLogoStyle] = useState(DEFAULT_LOGO_STYLE);

  useEffect(() => {
    let active = true;

    fetchConfig()
      .then((config) => {
        if (active) {
          setLogoStyle({
            ...DEFAULT_LOGO_STYLE,
            ...(config?.logoStyle || {}),
          });
        }
      })
      .catch(() => {
        if (active) setLogoStyle(DEFAULT_LOGO_STYLE);
      });

    return () => {
      active = false;
    };
  }, []);

  const logoUrl = logoStyle.logoUrl || logo100Pro;

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        px: 2,
        pt: 3,
        pb: 6,

        position: "relative",
        overflow: "hidden",
        ...(showBackground && {
          "&::before": {
            content: '""',
            position: "fixed",
            inset: 0,
            backgroundImage: `url(${logoUrl})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: `${Number(logoStyle.objectPositionX) || 50}% ${
              Number(logoStyle.objectPositionY) || 50
            }%`,
            opacity: 0.05,
            backgroundSize: isPortrait ? "45%" : "35%",
            pointerEvents: "none",
            zIndex: 0,
          },
        }),
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1180,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "relative",
          zIndex: 1,
        }}
      >
        <IconButton
          onClick={onBack}
          disabled={!showBack}
          sx={{ opacity: showBack ? 1 : 0 }}
        >
          <ArrowBackIcon sx={{ fontSize: 50 }} />
        </IconButton>

        {showLogo ? (
          <Box
            component="img"
            src={logoUrl}
            alt="Logo"
            sx={{
              width: "80px",
              height: "auto",
              objectFit: "contain",
              objectPosition: `${Number(logoStyle.objectPositionX) || 50}% ${
                Number(logoStyle.objectPositionY) || 50
              }%`,
              display: "block",
              mx: "auto",
            }}
          />
        ) : (
          <Box sx={{ width: "80px" }} />
        )}

        <IconButton onClick={onHome}>
          <HomeIcon sx={{ fontSize: 50 }} />
        </IconButton>
      </Box>

      <Box
        sx={{
          mt: 2,
          width: "100%",
          maxWidth: 1180,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
          position: "relative",
          zIndex: 1,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

export default ScreenLayout;
