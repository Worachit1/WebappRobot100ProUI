import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";

import logo100Pro from "../../public/assets/logo 100Pro.png";
import { fetchConfig } from "../api/client.js";

const DEFAULT_LOGO_STYLE = {
  topText: "ROBOT CONTROL",
  bottomText: "100 PRO",
  logoUrl: logo100Pro,
  logoWidth: 150,
  logoHeight: 100,
  objectPositionX: 50,
  objectPositionY: 50,
  themeColor: "#2d49ae",
};

function Logo() {
  const [logoStyle, setLogoStyle] = useState(DEFAULT_LOGO_STYLE);

  useEffect(() => {
    let active = true;

    fetchConfig()
      .then((config) => {
        if (!active) return;
        setLogoStyle({
          ...DEFAULT_LOGO_STYLE,
          ...(config?.logoStyle || {}),
          themeColor:
            config?.themeColor ||
            config?.logoStyle?.themeColor ||
            DEFAULT_LOGO_STYLE.themeColor,
        });
      })
      .catch(() => {
        if (active) setLogoStyle(DEFAULT_LOGO_STYLE);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Box sx={{ textAlign: "center", my: 1 }}>
      <Box
        component="img"
        src={logoStyle.logoUrl || logo100Pro}
        alt="Logo"
        sx={{
          width: `${Number(logoStyle.logoWidth) || 150}px`,
          height: `${Number(logoStyle.logoHeight) || 100}px`,
          objectFit: "contain",
          objectPosition: `${Number(logoStyle.objectPositionX) || 50}% ${
            Number(logoStyle.objectPositionY) || 50
          }%`,
        }}
      />
      <Typography
        variant="h6"
        sx={{
          fontWeight: 900,
          letterSpacing: 0.1,
          color: logoStyle.themeColor || "#2d49ae",
          fontSize: { xs: 18, md: 50 },
        }}
      >
        {logoStyle.topText || "ROBOT CONTROL"}
        <br />
        {logoStyle.bottomText || "100 PRO"}
      </Typography>
    </Box>
  );
}

export default Logo;
