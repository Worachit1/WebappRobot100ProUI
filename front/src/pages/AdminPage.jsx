import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
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
import LoginIcon from "@mui/icons-material/Login";
import ListAltIcon from "@mui/icons-material/ListAlt";
import LocationOnIcon from "@mui/icons-material/LocationOn";

import { useNavigate } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";
import { fetchConfig, login, updateConfig } from "../api/client.js";

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

function getPrimaryBaseUrl(config) {
  return config?.rcs?.[0]?.baseUrl || "";
}

function robotInitials(name) {
  return (name || "?").slice(0, 2).toUpperCase();
}

function AdminLogin({ onSuccess }) {
  const [username, setUsername] = useState(ADMIN_USERNAME);
  const [password, setPassword] = useState(ADMIN_PASSWORD);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await login(username, password);
      localStorage.setItem("authUser", res.username);
      localStorage.setItem("adminAuth", "true");
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%", maxWidth: 420 }}>
      <Paper
        elevation={0}
        sx={{
          border: "1px solid #d8deef",
          borderRadius: "4px",
          p: 3,
        }}
      >
        <Typography sx={{ color: "#2d49ae", fontSize: 24, fontWeight: 900, mb: 2 }}>
          ADMIN LOGIN
        </Typography>
        <TextField
          fullWidth
          label="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          margin="normal"
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          margin="normal"
        />
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          startIcon={<LoginIcon />}
          disabled={loading}
          sx={{ mt: 2, borderRadius: "4px", fontWeight: 900 }}
        >
          Login
        </Button>
      </Paper>
    </Box>
  );
}

function ModelProcessEditor({ robot, onChange }) {
  const entries = useMemo(
    () => Object.entries(robot.modelProcessCode || {}),
    [robot.modelProcessCode],
  );

  const updateKey = (oldKey, nextKey) => {
    const cleanKey = nextKey.trim();
    const next = { ...(robot.modelProcessCode || {}) };
    const value = next[oldKey] || "";
    delete next[oldKey];
    if (cleanKey) next[cleanKey] = value;
    onChange({ ...robot, modelProcessCode: next });
  };

  const updateValue = (key, value) => {
    onChange({
      ...robot,
      modelProcessCode: {
        ...(robot.modelProcessCode || {}),
        [key]: value,
      },
    });
  };

  const addProcess = () => {
    const current = robot.modelProcessCode || {};
    let index = entries.length + 1;
    let key = `process${index}`;
    while (Object.prototype.hasOwnProperty.call(current, key)) {
      index += 1;
      key = `process${index}`;
    }
    onChange({
      ...robot,
      modelProcessCode: {
        ...current,
        [key]: "",
      },
    });
  };

  const removeProcess = (key) => {
    const next = { ...(robot.modelProcessCode || {}) };
    delete next[key];
    onChange({ ...robot, modelProcessCode: next });
  };

  return (
    <Stack spacing={1.5}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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

      {entries.length === 0 ? (
        <Typography sx={{ color: "#667085", fontSize: 14 }}>No model process code</Typography>
      ) : (
        entries.map(([type, code]) => (
          <Box
            key={type}
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
              value={type}
              onChange={(event) => updateKey(type, event.target.value)}
            />
            <TextField
              size="small"
              label="Task"
              value={code}
              onChange={(event) => updateValue(type, event.target.value)}
            />
            <Tooltip title="Delete model process">
              <IconButton
                color="error"
                onClick={() => removeProcess(type)}
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
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("adminAuth") === "true");
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    setError("");
    fetchConfig()
      .then((data) => setConfig(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [isAdmin]);

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
          : [{ id: "rcs-1", name: "RCS-1", baseUrl: value, areaIds: [] }],
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

  return (
    <ScreenLayout
      title="Admin"
      onBack={() => navigate("/")}
      onHome={() => navigate("/")}
      contentMaxWidth={1180}
      headerMaxWidth={1180}
    >
      {!isAdmin ? (
        <AdminLogin onSuccess={() => setIsAdmin(true)} />
      ) : loading ? (
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
            <Typography sx={{ color: "#2d49ae", fontSize: 24, fontWeight: 900 }}>
              ROBOT ADMIN
            </Typography>
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={saving || !config}
              onClick={handleSave}
              sx={{ borderRadius: "4px", fontWeight: 900 }}
            >
              Save
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
            <Typography sx={{ color: "#1c2755", fontSize: 15, fontWeight: 900, mb: 1.5 }}>
              MAIN RCS BASE URL
            </Typography>
            <TextField
              fullWidth
              label="baseUrl"
              value={getPrimaryBaseUrl(config)}
              onChange={(event) => updatePrimaryBaseUrl(event.target.value)}
            />
          </Paper>

          <Stack spacing={2}>
            {(config?.robots || []).map((robot) => (
              <Paper
                key={robot.id}
                elevation={0}
                sx={{
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
                    gridTemplateColumns: { xs: "1fr", md: "140px 1fr" },
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
                        sx={{
                          width: "100%",
                          height: 108,
                          objectFit: "contain",
                          display: "block",
                        }}
                      />
                    ) : (
                      <Typography sx={{ color: "#2d49ae", fontSize: 26, fontWeight: 900 }}>
                        {robotInitials(robot.name)}
                      </Typography>
                    )}
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: { xs: "1fr", md: "1fr 220px 190px" },
                      gap: 2,
                      alignContent: "center",
                      alignItems: "center",
                    }}
                  >
                    <Box
                      sx={{
                        borderLeft: "4px solid #2d49ae",
                        pl: 1.5,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
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
                      <Typography
                        sx={{
                          color: "#667085",
                          fontSize: 13,
                          fontWeight: 800,
                          mt: 0.5,
                        }}
                      >
                        ID: {robot.id || "-"}
                      </Typography>
                    </Box>

                    <TextField
                      size="small"
                      label="deviceNum"
                      value={robot.deviceNum || ""}
                      onChange={(event) =>
                        updateRobotField(robot.id, "deviceNum", event.target.value)
                      }
                      sx={{ alignSelf: "center" }}
                    />

                    <Button
                      variant="outlined"
                      startIcon={<LocationOnIcon />}
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
                      Detail Point State
                    </Button>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <ModelProcessEditor
                  robot={robot}
                  onChange={(nextRobot) => updateRobot(robot.id, nextRobot)}
                />
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </ScreenLayout>
  );
}

export default AdminPage;
