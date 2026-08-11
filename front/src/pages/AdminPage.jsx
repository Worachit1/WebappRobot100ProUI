import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import SaveIcon from "@mui/icons-material/Save";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LocationOnIcon from "@mui/icons-material/LocationOn";

import { useNavigate } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";
import { fetchConfig, toggleForbiddenZone, updateConfig } from "../api/client.js";

function getPrimaryBaseUrl(config) {
  return config?.rcs?.[0]?.baseUrl || "";
}

function robotInitials(name) {
  return (name || "?").slice(0, 2).toUpperCase();
}

function makeRowKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function modelProcessToRows(modelProcessCode = {}) {
  return Object.entries(modelProcessCode).map(([type, code]) => ({
    rowKey: makeRowKey(),
    type,
    code,
  }));
}

function rowsToModelProcess(rows) {
  return rows.reduce((result, row) => {
    const type = row.type.trim();
    if (type) {
      result[type] = row.code;
    }
    return result;
  }, {});
}

function makeForbiddenZone() {
  return {
    id: `fz-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: "",
    enabled: false,
  };
}

function ModelProcessEditor({ robot, onChange }) {
  const [rows, setRows] = useState(() =>
    modelProcessToRows(robot.modelProcessCode),
  );

  const commitRows = (nextRows) => {
    setRows(nextRows);
    onChange({ ...robot, modelProcessCode: rowsToModelProcess(nextRows) });
  };

  const updateType = (rowKey, type) => {
    commitRows(
      rows.map((row) => (row.rowKey === rowKey ? { ...row, type } : row)),
    );
  };

  const updateValue = (rowKey, code) => {
    commitRows(
      rows.map((row) => (row.rowKey === rowKey ? { ...row, code } : row)),
    );
  };

  const addProcess = () => {
    const current = rowsToModelProcess(rows);
    let index = rows.length + 1;
    let key = `process${index}`;
    while (Object.prototype.hasOwnProperty.call(current, key)) {
      index += 1;
      key = `process${index}`;
    }

    commitRows([
      ...rows,
      {
        rowKey: makeRowKey(),
        type: key,
        code: "",
      },
    ]);
  };

  const removeProcess = (rowKey) => {
    commitRows(rows.filter((row) => row.rowKey !== rowKey));
  };

  return (
    <Stack spacing={1.5}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ color: "#1c2755", fontSize: 15, fontWeight: 900 }}>
          modelProcessCode
        </Typography>
        <Tooltip title="Add model process">
          <IconButton
            color="primary"
            onClick={addProcess}
            sx={{
              bgcolor: "#eef4ff",
              border: "1px solid #cddbf8",
              "&:hover": { bgcolor: "#dfeaff" },
            }}
          >
            <AddIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {rows.length === 0 ? (
        <Typography sx={{ color: "#667085", fontSize: 14 }}>
          No model process code
        </Typography>
      ) : (
        rows.map((row) => (
          <Box
            key={row.rowKey}
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "180px 1fr 44px" },
              gap: 1,
              alignItems: "center",
              p: 1,
              border: "1px solid #e8edf7",
              borderRadius: "4px",
              bgcolor: "#fbfcff",
            }}
          >
            <TextField
              size="small"
              label="Type"
              value={row.type}
              onChange={(event) => updateType(row.rowKey, event.target.value)}
            />
            <TextField
              size="small"
              label="Task"
              value={row.code}
              onChange={(event) => updateValue(row.rowKey, event.target.value)}
            />
            <Tooltip title="Delete model process">
              <IconButton
                color="error"
                onClick={() => removeProcess(row.rowKey)}
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
  );
}

function AdminPage() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [zoneActionId, setZoneActionId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const robotScrollRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartX = useRef(0);
  const dragStartScrollLeft = useRef(0);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError("");

    fetchConfig()
      .then((data) => setConfig(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const updateRobot = (robotId, nextRobot) => {
    setConfig((current) => ({
      ...current,
      robots: (current.robots || []).map((robot) =>
        robot.id === robotId ? nextRobot : robot,
      ),
    }));
  };

  const updateRobotField = (robotId, field, value) => {
    setConfig((current) => ({
      ...current,
      robots: (current.robots || []).map((robot) =>
        robot.id === robotId ? { ...robot, [field]: value } : robot,
      ),
    }));
  };

  const updatePrimaryBaseUrl = (value) => {
    setConfig((current) => ({
      ...current,
      rcs:
        current.rcs?.length > 0
          ? current.rcs.map((item, index) =>
              index === 0 ? { ...item, baseUrl: value } : item,
            )
          : [
              {
                id: "rcs-1",
                name: "RCS-1",
                baseUrl: value,
                areaIds: [],
              },
            ],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await updateConfig(config);
      setMessage("Saved successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const addForbiddenZone = () => {
    setConfig((current) => ({
      ...current,
      forbiddenZones: [...(current.forbiddenZones || []), makeForbiddenZone()],
    }));
  };

  const updateForbiddenZone = (zoneId, patch) => {
    setConfig((current) => ({
      ...current,
      forbiddenZones: (current.forbiddenZones || []).map((zone) =>
        zone.id === zoneId ? { ...zone, ...patch } : zone,
      ),
    }));
  };

  const removeForbiddenZone = (zoneId) => {
    setConfig((current) => ({
      ...current,
      forbiddenZones: (current.forbiddenZones || []).filter(
        (zone) => zone.id !== zoneId,
      ),
    }));
  };

  const handleToggleForbiddenZone = async (zone) => {
    const name = String(zone.name || "").trim();
    if (!name) {
      setError("Restricted Area name is required");
      return;
    }

    const nextEnabled = !zone.enabled;
    setError("");
    setMessage("");
    setZoneActionId(zone.id);

    try {
      const result = await toggleForbiddenZone(name, nextEnabled);
      updateForbiddenZone(zone.id, {
        name,
        enabled: nextEnabled,
        lastUpdatedAt: result.zone?.lastUpdatedAt || new Date().toISOString(),
        lastRcsResponse: result.rcsResponse,
      });
      setMessage(
        `${name} ${nextEnabled ? "enabled" : "disabled"} successfully`,
      );
    } catch (err) {
      setError(err.message || "Toggle restricted area failed");
    } finally {
      setZoneActionId("");
    }
  };

  const handleMouseDown = (event) => {
    const container = robotScrollRef.current;
    if (!container) return;

    setIsDragging(true);
    dragStartX.current = event.pageX;
    dragStartScrollLeft.current = container.scrollLeft;
  };

  const handleMouseMove = (event) => {
    if (!isDragging) return;

    const container = robotScrollRef.current;
    if (!container) return;

    event.preventDefault();

    const distance = event.pageX - dragStartX.current;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      container.scrollLeft = dragStartScrollLeft.current - distance;
    });
  };

  const stopDragging = () => {
    setIsDragging(false);

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };
  return (
    <ScreenLayout
      title="Admin"
      onBack={() => navigate("/")}
      onHome={() => navigate("/")}
      contentMaxWidth={1180}
      headerMaxWidth={1180}
    >
      {loading ? (
        <CircularProgress />
      ) : (
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
            <Typography
              sx={{
                color: "#2d49ae",
                fontSize: 24,
                fontWeight: 900,
              }}
            >
              ROBOT SETTINGS
            </Typography>

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saving || !config}
              onClick={handleSave}
              sx={{
                borderRadius: "4px",
                fontWeight: 900,
              }}
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
            <Typography
              sx={{
                color: "#1c2755",
                fontSize: 15,
                fontWeight: 900,
                mb: 1.5,
              }}
            >
              MAIN RCS BASE URL
            </Typography>

            <TextField
              fullWidth
              label="baseUrl"
              value={getPrimaryBaseUrl(config)}
              onChange={(event) => updatePrimaryBaseUrl(event.target.value)}
            />
          </Paper>

          <Paper
            elevation={0}
            sx={{
              border: "1px solid #cddbf8",
              borderRadius: "4px",
              p: { xs: 2, md: 2.5 },
              mb: 2,
              bgcolor: "#fff",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                mb: 1.5,
              }}
            >
              <Typography
                sx={{
                  color: "#1c2755",
                  fontSize: 15,
                  fontWeight: 900,
                }}
              >
                RESTRICTED AREA CONTROL
              </Typography>
              <Tooltip title="Add restricted area">
                <IconButton
                  color="primary"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={addForbiddenZone}
                  sx={{
                    bgcolor: "#eef4ff",
                    border: "1px solid #cddbf8",
                    "&:hover": { bgcolor: "#dfeaff" },
                  }}
                >
                  <AddIcon />
                </IconButton>
              </Tooltip>
            </Box>

            <Stack spacing={1}>
              {(config?.forbiddenZones || []).length === 0 ? (
                <Typography sx={{ color: "#667085", fontSize: 14 }}>
                  No restricted area configured
                </Typography>
              ) : (
                (config?.forbiddenZones || []).map((zone) => (
                  <Box
                    key={zone.id}
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "1fr 150px 44px",
                      },
                      gap: 1,
                      alignItems: "center",
                      p: 1,
                      border: "1px solid #e8edf7",
                      borderRadius: "4px",
                      bgcolor: "#fbfcff",
                    }}
                  >
                    <TextField
                      size="small"
                      label="matterArea"
                      value={zone.name || ""}
                      onMouseDown={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        updateForbiddenZone(zone.id, {
                          name: event.target.value,
                        })
                      }
                    />

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: { xs: "space-between", md: "center" },
                        gap: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          color: zone.enabled ? "#2e7d32" : "#667085",
                          fontWeight: 900,
                          fontSize: 13,
                        }}
                      >
                        {zone.enabled ? "ENABLE" : "DISABLE"}
                      </Typography>
                      <Switch
                        checked={Boolean(zone.enabled)}
                        disabled={zoneActionId === zone.id}
                        onMouseDown={(event) => event.stopPropagation()}
                        onChange={() => handleToggleForbiddenZone(zone)}
                      />
                    </Box>

                    <Tooltip title="Delete restricted area">
                      <IconButton
                        color="error"
                        onMouseDown={(event) => event.stopPropagation()}
                        onClick={() => removeForbiddenZone(zone.id)}
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

          <Box
            ref={robotScrollRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
            sx={{
              width: "100%",
              display: "flex",
              gap: 2,
              overflowX: "auto",
              overflowY: "hidden",
              pb: 2,
              cursor: isDragging ? "grabbing" : "grab",
              userSelect: isDragging ? "none" : "auto",
              scrollBehavior: "smooth",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {(config?.robots || []).map((robot) => (
              <Paper
                key={robot.id}
                elevation={0}
                sx={{
                  flex: "0 0 auto",
                  width: {
                    xs: "calc(100vw - 64px)",
                    sm: 520,
                    md: 560,
                  },
                  maxWidth: "90vw",
                  scrollSnapAlign: "start",
                  border: "1px solid #d8deef",
                  borderRadius: "4px",
                  p: { xs: 2, md: 2.5 },
                  bgcolor: "#fff",
                  boxShadow: "0 10px 28px rgba(22, 34, 72, 0.08)",
                }}
              >
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      md: "140px 1fr",
                    },
                    gap: 2,
                    alignItems: "stretch",
                  }}
                >
                  <Box
                    sx={{
                      minHeight: 124,
                      border: "1px solid #e4e9f5",
                      borderRadius: "4px",
                      bgcolor: "#f6f8fc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                      p: 1,
                    }}
                  >
                    {robot.imageUrl ? (
                      <Box
                        component="img"
                        src={robot.imageUrl}
                        alt={robot.name || "robot"}
                        draggable={false}
                        sx={{
                          width: "100%",
                          height: 108,
                          objectFit: "contain",
                          display: "block",
                          pointerEvents: "none",
                        }}
                      />
                    ) : (
                      <Typography
                        sx={{
                          color: "#2d49ae",
                          fontSize: 26,
                          fontWeight: 900,
                        }}
                      >
                        {robotInitials(robot.name)}
                      </Typography>
                    )}
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "1fr",
                      },
                      gap: 2,
                      alignContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        borderLeft: "4px solid #2d49ae",
                        pl: 1.5,
                        minWidth: 0,
                      }}
                    >
                      <Typography
                        sx={{
                          color: "#101828",
                          fontSize: { xs: 24, md: 28 },
                          fontWeight: 900,
                          lineHeight: 1.1,
                          overflowWrap: "anywhere",
                        }}
                      >
                        {robot.name || "-"}
                      </Typography>
                    </Box>

                    <TextField
                      size="small"
                      label="Device Number"
                      value={robot.deviceNum || ""}
                      onMouseDown={(event) => event.stopPropagation()}
                      onChange={(event) =>
                        updateRobotField(
                          robot.id,
                          "deviceNum",
                          event.target.value,
                        )
                      }
                    />

                    <Button
                      variant="outlined"
                      startIcon={<LocationOnIcon />}
                      onMouseDown={(event) => event.stopPropagation()}
                      onClick={() =>
                        navigate(
                          `/admin/point-state?robotId=${encodeURIComponent(
                            robot.id,
                          )}&robotName=${encodeURIComponent(robot.name || "")}`,
                        )
                      }
                      sx={{
                        borderRadius: "4px",
                        fontWeight: 900,
                        minHeight: 40,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Route Points
                    </Button>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Box onMouseDown={(event) => event.stopPropagation()}>
                  <ModelProcessEditor
                    robot={robot}
                    onChange={(nextRobot) => updateRobot(robot.id, nextRobot)}
                  />
                </Box>
              </Paper>
            ))}
          </Box>
        </Box>
      )}
    </ScreenLayout>
  );
}

export default AdminPage;
