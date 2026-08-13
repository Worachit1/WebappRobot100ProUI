import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Slider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SaveIcon from "@mui/icons-material/Save";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { useNavigate } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";
import { fetchConfig, updateConfig, uploadLogoAsset } from "../api/client.js";
import fallbackLogo from "../../public/assets/logo 100Pro.png";

const DEFAULT_LOGO_STYLE = {
  topText: "ROBOT CONTROL",
  bottomText: "100 PRO",
  logoUrl: "/assets/logo 100Pro.png",
  logoWidth: 150,
  logoHeight: 100,
  objectPositionX: 50,
  objectPositionY: 50,
  themeColor: "#2d49ae",
};

const THEME_COLORS = [
  "#2d49ae",
  "#0b4dbb",
  "#1565c0",
  "#00897b",
  "#2e7d32",
  "#6a1b9a",
  "#c62828",
  "#ef6c00",
];

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function mergeLogoStyle(config) {
  return {
    ...DEFAULT_LOGO_STYLE,
    ...(config?.logoStyle || {}),
    themeColor:
      config?.themeColor ||
      config?.logoStyle?.themeColor ||
      DEFAULT_LOGO_STYLE.themeColor,
  };
}

function LogoStylePage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [config, setConfig] = useState(null);
  const [logoStyle, setLogoStyle] = useState(DEFAULT_LOGO_STYLE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");

    fetchConfig()
      .then((data) => {
        setConfig(data);
        setLogoStyle(mergeLogoStyle(data));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const previewLogoUrl = useMemo(() => {
    return logoStyle.logoUrl || fallbackLogo;
  }, [logoStyle.logoUrl]);

  const updateLogoStyleField = (field, value) => {
    setLogoStyle((current) => ({ ...current, [field]: value }));
  };

  const handleUploadLogo = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const dataUrl = await readFileAsDataUrl(file);
      const result = await uploadLogoAsset({
        fileName: file.name,
        mimeType: file.type,
        dataUrl,
      });
      setLogoStyle((current) => ({
        ...current,
        logoUrl: result.path,
        objectPositionX: 50,
        objectPositionY: 50,
      }));
      setMessage("Logo uploaded. Press Save to apply it.");
    } catch (err) {
      setError(err.message || "Upload logo failed");
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const resetLogoStyle = () => {
    setLogoStyle(DEFAULT_LOGO_STYLE);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const nextStyle = {
        ...logoStyle,
        logoWidth: Number(logoStyle.logoWidth) || DEFAULT_LOGO_STYLE.logoWidth,
        logoHeight:
          Number(logoStyle.logoHeight) || DEFAULT_LOGO_STYLE.logoHeight,
        objectPositionX: Number(logoStyle.objectPositionX) || 50,
        objectPositionY: Number(logoStyle.objectPositionY) || 50,
      };
      const nextConfig = {
        ...(config || {}),
        themeColor: nextStyle.themeColor,
        logoStyle: nextStyle,
      };
      await updateConfig(nextConfig);
      setConfig(nextConfig);
      setLogoStyle(nextStyle);
      window.dispatchEvent(
        new CustomEvent("app-theme-color-change", {
          detail: { themeColor: nextStyle.themeColor },
        }),
      );
      setMessage("Saved successfully");
    } catch (err) {
      setError(err.message || "Save logo style failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout
      title="Logo Style"
      onBack={() => navigate("/admin")}
      onHome={() => navigate("/")}
      contentMaxWidth={1180}
      headerMaxWidth={1180}
    >
      <Box sx={{ width: "100%" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: { xs: "stretch", md: "center" },
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
            mb: 2,
          }}
        >
          <Typography sx={{ color: "primary.main", fontSize: 24, fontWeight: 900 }}>
            LOGO STYLE
          </Typography>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={saving || loading || uploading}
            onClick={handleSave}
            sx={{ borderRadius: "4px", fontWeight: 900 }}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
        </Box>

        {message && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {message}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading ? (
          <CircularProgress />
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "440px 1fr" },
              gap: 2,
              alignItems: "start",
            }}
          >
            <Paper
              elevation={0}
              sx={{
                border: "1px solid #d8deef",
                borderRadius: "4px",
                p: { xs: 2, md: 2.5 },
                bgcolor: "#fff",
                boxShadow: "0 10px 28px rgba(22, 34, 72, 0.08)",
              }}
            >
              <Typography
                sx={{ color: "#1c2755", fontSize: 15, fontWeight: 900, mb: 2 }}
              >
                PREVIEW
              </Typography>
              <Box
                sx={{
                  minHeight: 330,
                  border: "1px solid #e4e9f5",
                  borderRadius: "4px",
                  bgcolor: "#f8fbff",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  p: 2,
                  textAlign: "center",
                }}
              >
                <Box
                  component="img"
                  src={previewLogoUrl}
                  alt="Logo preview"
                  sx={{
                    width: `${Number(logoStyle.logoWidth) || 150}px`,
                    height: `${Number(logoStyle.logoHeight) || 100}px`,
                    objectFit: "contain",
                    objectPosition: `${
                      Number(logoStyle.objectPositionX) || 50
                    }% ${Number(logoStyle.objectPositionY) || 50}%`,
                    border: "1px dashed #cddbf8",
                    bgcolor: "#fff",
                  }}
                />
                <Typography
                  sx={{
                    mt: 2,
                    color: logoStyle.themeColor,
                    fontSize: { xs: 28, md: 38 },
                    lineHeight: 1.08,
                    fontWeight: 900,
                    overflowWrap: "anywhere",
                  }}
                >
                  {logoStyle.topText || "ROBOT CONTROL"}
                  <br />
                  {logoStyle.bottomText || "100 PRO"}
                </Typography>
              </Box>
            </Paper>

            <Paper
              elevation={0}
              sx={{
                border: "1px solid #cddbf8",
                borderRadius: "4px",
                p: { xs: 2, md: 2.5 },
                bgcolor: "#f8fbff",
              }}
            >
              <Stack spacing={2}>
                <Typography
                  sx={{ color: "#1c2755", fontSize: 15, fontWeight: 900 }}
                >
                  TEXT
                </Typography>
                <TextField
                  label="Top text"
                  value={logoStyle.topText || ""}
                  onChange={(event) =>
                    updateLogoStyleField("topText", event.target.value)
                  }
                />
                <TextField
                  label="Bottom text"
                  value={logoStyle.bottomText || ""}
                  onChange={(event) =>
                    updateLogoStyleField("bottomText", event.target.value)
                  }
                />

                <Typography
                  sx={{ color: "#1c2755", fontSize: 15, fontWeight: 900 }}
                >
                  LOGO IMAGE
                </Typography>
                <Typography sx={{ color: "#667085", fontSize: 13 }}>
                  Recommended size: PNG/WebP with transparent background,
                  around 512 x 512 px or wider. Keep the main mark centered.
                </Typography>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleUploadLogo}
                />
                <Button
                  variant="outlined"
                  startIcon={<CloudUploadIcon />}
                  disabled={uploading || saving}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ borderRadius: "4px", fontWeight: 900 }}
                >
                  {uploading ? "Uploading..." : "Upload Logo"}
                </Button>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                    gap: 1.5,
                  }}
                >
                  <TextField
                    type="number"
                    label="Logo width"
                    value={logoStyle.logoWidth}
                    onChange={(event) =>
                      updateLogoStyleField("logoWidth", event.target.value)
                    }
                  />
                  <TextField
                    type="number"
                    label="Logo height"
                    value={logoStyle.logoHeight}
                    onChange={(event) =>
                      updateLogoStyleField("logoHeight", event.target.value)
                    }
                  />
                </Box>

                <Box>
                  <Typography sx={{ color: "#475467", fontWeight: 800 }}>
                    Image X position
                  </Typography>
                  <Slider
                    min={0}
                    max={100}
                    value={Number(logoStyle.objectPositionX) || 50}
                    onChange={(_, value) =>
                      updateLogoStyleField("objectPositionX", value)
                    }
                  />
                </Box>
                <Box>
                  <Typography sx={{ color: "#475467", fontWeight: 800 }}>
                    Image Y position
                  </Typography>
                  <Slider
                    min={0}
                    max={100}
                    value={Number(logoStyle.objectPositionY) || 50}
                    onChange={(_, value) =>
                      updateLogoStyleField("objectPositionY", value)
                    }
                  />
                </Box>

                <Typography
                  sx={{ color: "#1c2755", fontSize: 15, fontWeight: 900 }}
                >
                  THEME COLOR
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {THEME_COLORS.map((color) => (
                    <Button
                      key={color}
                      aria-label={color}
                      onClick={() => updateLogoStyleField("themeColor", color)}
                      sx={{
                        minWidth: 42,
                        width: 42,
                        height: 42,
                        borderRadius: "4px",
                        bgcolor: color,
                        border:
                          logoStyle.themeColor === color
                            ? "3px solid #101828"
                            : "1px solid #d8deef",
                        "&:hover": { bgcolor: color },
                      }}
                    />
                  ))}
                </Box>
                <TextField
                  type="color"
                  label="Custom theme color"
                  value={logoStyle.themeColor || DEFAULT_LOGO_STYLE.themeColor}
                  onChange={(event) =>
                    updateLogoStyleField("themeColor", event.target.value)
                  }
                  sx={{ maxWidth: 220 }}
                />

                <Button
                  variant="text"
                  startIcon={<RestartAltIcon />}
                  color="primary"
                  onClick={resetLogoStyle}
                  sx={{ alignSelf: "flex-start", fontWeight: 900 }}
                >
                  Reset Default
                </Button>
              </Stack>
            </Paper>
          </Box>
        )}
      </Box>
    </ScreenLayout>
  );
}

export default LogoStylePage;
