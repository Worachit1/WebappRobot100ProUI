import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import { useNavigate, useSearchParams } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";
import { fetchConfig, updateConfig } from "../api/client.js";

function hasThaiText(value) {
  return /[\u0E00-\u0E7F]/.test(String(value || ""));
}

function makeRandomDigits() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function makeRowKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function makeSpotId(name, currentId = "") {
  if (hasThaiText(name)) {
    return /^s-\d{6}$/.test(currentId) ? currentId : `s-${makeRandomDigits()}`;
  }

  const cleaned = String(name || "")
    .toLowerCase()
    .replace(/[\/()_\s]/g, "")
    .replace(/[^a-z0-9-]/g, "");

  return cleaned ? `s-${cleaned}` : "";
}

function prepareSpotRows(spots) {
  return (spots || []).map((spot) => ({
    ...spot,
    rowKey: makeRowKey(),
  }));
}

function getRobotSpots(config, robotId) {
  return (config?.spots || []).flatMap((group) => group[robotId] || []);
}

function updateRobotSpots(config, robotId, nextSpots) {
  const currentGroups = config?.spots || [];
  const groupIndex = currentGroups.findIndex((group) =>
    Object.prototype.hasOwnProperty.call(group, robotId),
  );

  if (groupIndex === -1) {
    return {
      ...config,
      spots: [...currentGroups, { [robotId]: nextSpots }],
    };
  }

  return {
    ...config,
    spots: currentGroups.map((group, index) =>
      index === groupIndex ? { ...group, [robotId]: nextSpots } : group,
    ),
  };
}

function PointStatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const robotId = searchParams.get("robotId") || "";
  const robotName = searchParams.get("robotName") || robotId;

  const [config, setConfig] = useState(null);
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchConfig()
      .then((data) => {
        setConfig(data);
        setSpots(prepareSpotRows(getRobotSpots(data, robotId)));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [robotId]);

  const robot = useMemo(() => {
    return (config?.robots || []).find(
      (item) => String(item.id) === String(robotId),
    );
  }, [config, robotId]);

  const updateSpotName = (index, name) => {
    setSpots((current) =>
      current.map((spot, itemIndex) =>
        itemIndex === index
          ? {
              ...spot,
              id: makeSpotId(name, spot.id),
              name,
              rcsPosition: name,
            }
          : spot,
      ),
    );
  };

  const addSpot = () => {
    setSpots((current) => [
      ...current,
      {
        rowKey: makeRowKey(),
        id: "",
        name: "",
        rcsPosition: "",
      },
    ]);
  };

  const deleteSpot = (index) => {
    setSpots((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  };

  const handleSave = async () => {
    const invalid = spots.some((spot) => !spot.name.trim());
    if (invalid) {
      setError("Please fill every spot name before saving");
      setMessage("");
      return;
    }

    const nextSpots = spots.map((spot) => ({
      id: makeSpotId(spot.name, spot.id),
      name: spot.name.trim(),
      rcsPosition: spot.name.trim(),
    }));

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const nextConfig = updateRobotSpots(config, robotId, nextSpots);
      await updateConfig(nextConfig);
      setConfig(nextConfig);
      setSpots(prepareSpotRows(nextSpots));
      setMessage("Saved successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenLayout
      title="Point State"
      onBack={() => navigate("/admin")}
      onHome={() => navigate("/")}
      contentMaxWidth={1180}
      headerMaxWidth={1180}
    >
      <Box sx={{ width: "100%" }}>
        <Paper
          elevation={0}
          sx={{
            border: "1px solid #cddbf8",
            borderRadius: "4px",
            p: { xs: 2, md: 2.5 },
            mb: 2,
            bgcolor: "#f8fbff",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "120px 1fr auto" },
              gap: 2,
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                height: 96,
                border: "1px solid #e4e9f5",
                borderRadius: "4px",
                bgcolor: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                p: 1,
              }}
            >
              {robot?.imageUrl ? (
                <Box
                  component="img"
                  src={robot.imageUrl}
                  alt={robot.name || "robot"}
                  sx={{ width: "100%", height: 80, objectFit: "contain" }}
                />
              ) : (
                <Typography
                  sx={{ color: "primary.main", fontSize: 24, fontWeight: 900 }}
                >
                  {(robotName || "?").slice(0, 2).toUpperCase()}
                </Typography>
              )}
            </Box>

            <Box>
              <Typography
                sx={{ color: "primary.main", fontSize: 24, fontWeight: 900 }}
              >
                ROUTE POINTS
              </Typography>
              <Typography
                sx={{ color: "#101828", fontSize: 18, fontWeight: 900 }}
              >
                {robotName || "-"}
              </Typography>
            </Box>

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saving || loading || !robotId}
              onClick={handleSave}
              sx={{ borderRadius: "4px", fontWeight: 900 }}
            >
              Save
            </Button>
          </Box>
        </Paper>

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
          <Paper
            elevation={0}
            sx={{
              border: "1px solid #d8deef",
              borderRadius: "4px",
              p: { xs: 2, md: 2.5 },
              boxShadow: "0 10px 28px rgba(22, 34, 72, 0.08)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "stretch", md: "center" },
                justifyContent: "space-between",
                flexDirection: { xs: "column", md: "row" },
                gap: 1.5,
                mb: 2,
              }}
            >
              <Typography
                sx={{ color: "#1c2755", fontSize: 16, fontWeight: 900 }}
              >
                NODE NAMES
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={addSpot}
                sx={{ borderRadius: "4px", fontWeight: 900 }}
              >
                Add Point
              </Button>
            </Box>

            <Stack spacing={1.5}>
              {spots.length === 0 ? (
                <Box
                  sx={{
                    border: "1px dashed #b7c4dc",
                    borderRadius: "4px",
                    p: 3,
                    textAlign: "center",
                    bgcolor: "#fbfcff",
                  }}
                >
                  <Typography sx={{ color: "#667085", fontWeight: 800 }}>
                    No points for this robot
                  </Typography>
                </Box>
              ) : (
                spots.map((spot, index) => (
                  <Box
                    key={spot.rowKey || index}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "32px 1fr 44px",
                        md: "33px minmax(0, 1fr) 44px",
                      },
                      gap: 1,
                      alignItems: "center",
                      p: 1.5,
                      border: "1px solid #e8edf7",
                      borderRadius: "4px",
                      bgcolor: "#fbfcff",
                    }}
                  >
                    {index + 1}.{" "}
                    <TextField
                      size="small"
                      label="Node Name"
                      value={spot.name || ""}
                      onChange={(event) =>
                        updateSpotName(index, event.target.value)
                      }
                    />
                    <Tooltip title="Delete point">
                      <IconButton
                        color="error"
                        onClick={() => deleteSpot(index)}
                        sx={{
                          width: 40,
                          height: 40,
                          justifySelf: { xs: "end", md: "center" },
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                ))
              )}
            </Stack>
          </Paper>
        )}
      </Box>
    </ScreenLayout>
  );
}

export default PointStatePage;
