import React from "react";
import { Box, Typography } from "@mui/material";

import logo100Pro from "../../public/assets/logo 100Pro.png";

function Logo() {
  return (
    <Box sx={{ textAlign: "center", my: 1 }}>
      <Box
        component="img"
        src={logo100Pro}
        alt="Logo"
        sx={{
          width: "150px",
          height: "100px",
          objectFit: "contain",
        }}
      />
      <Typography
        variant="h6"
        sx={{
          fontWeight: 900,
          letterSpacing: 0.1,
          color: "#2d49ae",
          fontSize: { xs: 18, md: 50 },
        }}
      >
        ROBOT CONTROL 
        <br />
        100 PRO
      </Typography>
    </Box>
  );
}

export default Logo;
