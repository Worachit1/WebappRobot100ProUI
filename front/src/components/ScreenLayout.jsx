import React from "react";
import { Box, IconButton, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import HomeIcon from "@mui/icons-material/Home";

import logo100Pro from "../../public/assets/logo 100Pro.png";

function ScreenLayout({
  title,
  onBack,
  onHome,
  children,
  showBack = true,
  showLogo = true,
  showBackground = true, // เพิ่ม
}) {
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
          backgroundImage: `url(${logo100Pro})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center center",
          opacity: 0.05,
          backgroundSize: {
            xs: "90%",
            md: "35%",
          },
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
            src={logo100Pro}
            alt="Logo"
            sx={{
              width: "80px",
              height: "auto",
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
