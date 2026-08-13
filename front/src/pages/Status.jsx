import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  FormControl,
  LinearProgress,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import BatteryChargingFullIcon from "@mui/icons-material/BatteryChargingFull";
import BatteryFullIcon from "@mui/icons-material/BatteryFull";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import AssignmentIcon from "@mui/icons-material/Assignment";
import WifiIcon from "@mui/icons-material/Wifi";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";
import {
  cancelOrder,
  cancelRunningOrder,
  fetchConfig,
  fetchRobotStatus,
} from "../api/client.js";

const STATUS_SELECTED_ROBOT_KEY = "statusSelectedRobotId";

const AGV_STATUS_COLOR = {
  OFFLINE: "#616161",
  FREE: "#2e7d32",
  ALARM: "#d32f2f",
  INITIALIZING: "#fb8c00",
  RUNNING: "#1976d2",
  CHARGING: "#00897b",
  UPGRADING: "#7b1fa2",
};

function InfoCard({
  icon,
  title,
  value,
  color = "primary.main",
  valueColor = "#111827",
}) {
  return (
    <Box
      sx={{
        bgcolor: "#fff",
        borderRadius: "4px",
        p: 1.2,
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        border: "1px solid #eef0f5",
        minHeight: 78,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.5 }}>
        <Box
          sx={{
            width: 26,
            height: 26,
            borderRadius: "50%",
            bgcolor: `${color}18`,
            color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "& svg": { fontSize: 17 },
          }}
        >
          {icon}
        </Box>

        <Typography sx={{ fontWeight: 900, color: "#667085", fontSize: 12 }}>
          {title}
        </Typography>
      </Box>

      <Typography
        sx={{
          fontSize: { xs: 14, md: 16 },
          fontWeight: 900,
          color: valueColor,
          wordBreak: "break-word",
          lineHeight: 1.15,
        }}
      >
        {value || "-"}
      </Typography>
    </Box>
  );
}

function StatusBadge({ status, error }) {
  const isError = Boolean(error);
  const text = isError ? "ERROR" : status || "ONLINE";
  const color = isError ? "#d32f2f" : AGV_STATUS_COLOR[status] || "#2e7d32";
  const bg = isError ? "#ffebee" : `${color}18`;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 0.7,
        borderRadius: 999,
        bgcolor: bg,
        color,
        fontWeight: 900,
        fontSize: 14,
      }}
    >
      {isError ? (
        <ErrorOutlineIcon fontSize="small" />
      ) : (
        <WifiIcon fontSize="small" />
      )}
      {text}
    </Box>
  );
}

function formatDelay(seconds) {
  const safeSeconds = Math.max(Number(seconds) || 0, 0);
  if (safeSeconds === 0) return "0 min";
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${minutes} min${rest ? ` ${rest} sec` : ""}`;
}

function formatRemaining(ms) {
  const seconds = Math.ceil(Math.max(Number(ms) || 0, 0) / 1000);
  return formatDelay(seconds);
}

function taskStatusColor(task) {
  if (task.status === "DELAYING") return "#7b1fa2";
  if (task.canCancelRunning) return "#1976d2";
  return "#ed6c02";
}

function Status() {
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [robotId, setRobotId] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchConfig().then((data) => {
      setConfig(data);

      const savedRobotId = localStorage.getItem(STATUS_SELECTED_ROBOT_KEY);
      const exists = data.robots?.some(
        (item) => String(item.id) === String(savedRobotId),
      );

      if (exists) {
        setRobotId(savedRobotId);
      } else if (data.robots?.length) {
        setRobotId(data.robots[0].id);
      }
    });
  }, []);

  const reloadStatus = async () => {
    if (!robotId) return;
    const data = await fetchRobotStatus(robotId);
    setStatus(data);
  };

  useEffect(() => {
    if (!robotId) return;

    setLoading(true);
    fetchRobotStatus(robotId)
      .then((data) => setStatus(data))
      .finally(() => setLoading(false));
  }, [robotId]);

  useEffect(() => {
    if (!robotId || !config) return;

    const intervalMs = config.statusRefreshIntervalMs ?? 5000;
    const timer = setInterval(() => {
      fetchRobotStatus(robotId)
        .then((data) => setStatus(data))
        .catch(() => {});
    }, intervalMs);

    return () => clearInterval(timer);
  }, [robotId, config]);

  const selectedRobot = useMemo(() => {
    return config?.robots?.find((item) => String(item.id) === String(robotId));
  }, [config, robotId]);

  const deviceStatus = status?.deviceStatus || {};
  const tasks = status?.tasks || [];
  const battery = Number(deviceStatus?.battery ?? 0);
  const safeBattery = Number.isFinite(battery)
    ? Math.max(0, Math.min(100, battery))
    : 0;
  const agvStatus = deviceStatus?.agvStatus || deviceStatus?.state || "-";
  const agvStatusColor = AGV_STATUS_COLOR[agvStatus] || "#111827";
  const charging = deviceStatus?.charging ? "CHARGING" : "NOT CHARGING";
  const assignUrl = selectedRobot
    ? `/pickup-select?robotId=${encodeURIComponent(
        selectedRobot.id,
      )}&robotName=${encodeURIComponent(selectedRobot.name || "")}`
    : "/select-robot";

  const handleCancel = async (task) => {
    const result = await Swal.fire({
      title: "Cancel Order?",
      text: `Cancel order ${task.orderId}?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Cancel Order",
      cancelButtonText: "Back",
      confirmButtonColor: "#d32f2f",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoading(true);
      await cancelOrder(task.orderId);
      await reloadStatus();
      await Swal.fire({
        icon: "success",
        title: "Cancelled",
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Cancel failed",
        text: err?.message || "Cancel order failed",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRunning = async (task) => {
    const result = await Swal.fire({
      title: "Cancel Running?",
      text: `Cancel running order ${task.orderId} in RCS?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Cancel in RCS",
      cancelButtonText: "Back",
      confirmButtonColor: "#d32f2f",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoading(true);
      await cancelRunningOrder(task.orderId, false);
      await reloadStatus();
      await Swal.fire({
        icon: "success",
        title: "Cancelled",
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Cancel failed",
        text: err?.message || "Cancel running failed",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReleaseRunning = async (task) => {
    const result = await Swal.fire({
      title: "Release WebApp Task?",
      html: `
        <div style="text-align:left">
          <p><b>Order ID:</b> ${task.orderId}</p>
          <p>This will cancel/release this task in WebApp only.</p>
          <p>Use this after the task was already cancelled in RCS.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Release",
      cancelButtonText: "Back",
      confirmButtonColor: "#ed6c02",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setActionLoading(true);
      await cancelRunningOrder(task.orderId, true);
      await reloadStatus();
      await Swal.fire({
        icon: "success",
        title: "Released",
        timer: 1000,
        showConfirmButton: false,
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Release failed",
        text: err?.message || "Release task failed",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <ScreenLayout
      title="สถานะหุ่นยนต์"
      onBack={() => navigate("/")}
      onHome={() => navigate("/")}
      contentMaxWidth={1180}
      headerMaxWidth={1180}
    >
      <Box sx={{ width: "100%", maxWidth: 1180, mx: "auto", p: { xs: 0.5, md: 1 } }}>
        <Typography
          sx={{
            width: "100%",
            textAlign: "center",
            color: "primary.main",
            fontSize: { xs: 14, md: 16 },
            fontWeight: 900,
            border: "1px solid #000",
            mb: 1.5,
            py: 0.4,
            boxSizing: "border-box",
            letterSpacing: 0.5,
          }}
        >
          ROBOT STATUS
        </Typography>

        {!config ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <FormControl fullWidth sx={{ mb: 1.5 }}>
              <Select
                value={robotId}
                onChange={(event) => {
                  setRobotId(event.target.value);
                  localStorage.setItem(STATUS_SELECTED_ROBOT_KEY, event.target.value);
                }}
                sx={{
                  bgcolor: "#fff",
                  borderRadius: "4px",
                  fontWeight: 900,
                  height: 44,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
              >
                {config.robots?.map((item) => (
                  <MenuItem key={item.id} value={item.id}>
                    {item.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", mt: 6 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", md: "240px 1fr" },
                    gap: 1.5,
                    mb: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      bgcolor: "#fff",
                      borderRadius: "4px",
                      p: 1.5,
                      boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                      border: "1px solid #eef0f5",
                      textAlign: "center",
                    }}
                  >
                    <Box
                      sx={{
                        width: { xs: 110, md: 140 },
                        height: { xs: 110, md: 140 },
                        borderRadius: "50%",
                        bgcolor: "#f4f7ff",
                        mx: "auto",
                        mb: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        border: "3px solid #eef2ff",
                      }}
                    >
                      {selectedRobot?.imageUrl ? (
                        <Box
                          component="img"
                          src={selectedRobot.imageUrl}
                          alt={selectedRobot.name}
                          sx={{ width: "100%", height: "100%", objectFit: "contain" }}
                        />
                      ) : (
                        <SmartToyIcon sx={{ fontSize: 90, color: "primary.main" }} />
                      )}
                    </Box>

                    <Typography
                      sx={{
                        fontSize: { xs: 16, md: 18 },
                        fontWeight: 900,
                        color: "primary.main",
                      }}
                    >
                      {selectedRobot?.name || status?.robot?.name || "-"}
                    </Typography>

                    <Box sx={{ mt: 1.5 }}>
                      <StatusBadge status={agvStatus} error={deviceStatus?.error} />
                    </Box>
                  </Box>

                  {deviceStatus?.error ? (
                    <Box
                      sx={{
                        bgcolor: "#fff",
                        borderRadius: "4px",
                        p: 3,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.10)",
                        border: "1px solid #ffcdd2",
                      }}
                    >
                      <Typography sx={{ color: "#d32f2f", fontSize: 22, fontWeight: 900, mb: 1 }}>
                        RCS ERROR
                      </Typography>
                      <Typography sx={{ color: "#d32f2f", fontWeight: 700 }}>
                        {deviceStatus.error}
                      </Typography>
                      {deviceStatus?.url && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ display: "block", mt: 2, wordBreak: "break-all" }}
                        >
                          URL: {deviceStatus.url}
                        </Typography>
                      )}
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                        gap: 1,
                      }}
                    >
                      <InfoCard
                        icon={<WifiIcon />}
                        title="STATUS"
                        value={agvStatus}
                        color={agvStatusColor}
                        valueColor={agvStatusColor}
                      />
                      <InfoCard
                        icon={<LocationOnIcon />}
                        title="POSITION"
                        value={deviceStatus?.devicePosition || "-"}
                        color="#ed6c02"
                      />
                      <Box
                        sx={{
                          bgcolor: "#fff",
                          borderRadius: "4px",
                          p: 1.2,
                          minHeight: 78,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                          border: "1px solid #eef0f5",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <Box
                            sx={{
                              width: 26,
                              height: 26,
                              "& svg": { fontSize: 17 },
                              borderRadius: "50%",
                              bgcolor: (theme) => `${theme.palette.primary.main}18`,
                              color: "primary.main",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <BatteryFullIcon />
                          </Box>
                          <Typography sx={{ fontWeight: 900, color: "#667085" }}>
                            BATTERY
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontSize: { xs: 16, md: 18 },
                            fontWeight: 900,
                            color: "#111827",
                            mb: 1,
                          }}
                        >
                          {deviceStatus?.battery ?? "-"}%
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={safeBattery}
                          sx={{
                            height: 7,
                            borderRadius: 99,
                            bgcolor: "#e5e7eb",
                            "& .MuiLinearProgress-bar": {
                              borderRadius: 99,
                              bgcolor:
                                safeBattery <= 20
                                  ? "#d32f2f"
                                  : safeBattery <= 50
                                    ? "#ed6c02"
                                    : "#2e7d32",
                            },
                          }}
                        />
                      </Box>
                      <InfoCard
                        icon={<BatteryChargingFullIcon />}
                        title="CHARGING"
                        value={charging}
                        color={charging === "CHARGING" ? "#2e7d32" : "#111827"}
                        valueColor={charging === "CHARGING" ? "#2e7d32" : "#111827"}
                      />
                    </Box>
                  )}
                </Box>

                <Box
                  sx={{
                    bgcolor: "#fff",
                    borderRadius: "4px",
                    p: 1.5,
                    boxShadow: "0 6px 18px rgba(0,0,0,0.08)",
                    border: "1px solid #eef0f5",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    <AssignmentIcon sx={{ color: "primary.main" }} />
                    <Typography
                      sx={{
                        color: "primary.main",
                        fontWeight: 900,
                        fontSize: { xs: 14, md: 16 },
                      }}
                    >
                      ORDER QUEUE
                    </Typography>
                  </Box>

                  {tasks.length === 0 ? (
                    <Typography sx={{ color: "#667085", fontWeight: 800 }}>
                      Not works.
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {tasks.map((task, index) => (
                        <Box
                          key={task.orderId}
                          sx={{
                            display: "grid",
                            gridTemplateColumns: {
                              xs: "1fr",
                              md: "52px 1.3fr 1fr 120px 130px 148px",
                            },
                            gap: 1,
                            alignItems: "center",
                            border: "1px solid #eef0f5",
                            borderRadius: "4px",
                            p: 1,
                            bgcolor: "#fbfcff",
                          }}
                        >
                          <Typography sx={{ fontWeight: 900 }}>#{index + 1}</Typography>
                          <Typography sx={{ fontWeight: 800 }}>
                            {task.pickup?.name || "-"} → {task.drop?.name || "-"}
                          </Typography>
                          <Typography sx={{ color: "#667085", fontSize: 12 }}>
                            {task.orderId}
                          </Typography>
                          <Typography
                            sx={{
                              color: taskStatusColor(task),
                              fontWeight: 900,
                            }}
                          >
                            {task.status}
                          </Typography>
                          <Typography sx={{ fontWeight: 800 }}>
                            Delay:{" "}
                            {task.status === "DELAYING"
                              ? formatRemaining(task.remainingDelayMs)
                              : formatDelay(task.delaySeconds)}
                          </Typography>
                          <Box sx={{ display: "flex", gap: 0.75 }}>
                            <Button
                              variant="outlined"
                              color="error"
                              disabled={actionLoading}
                              onClick={() =>
                                task.canCancelRunning
                                  ? handleCancelRunning(task)
                                  : handleCancel(task)
                              }
                              sx={{
                                borderRadius: "4px",
                                fontWeight: 900,
                                minWidth: task.canCancelRunning ? 86 : 100,
                              }}
                            >
                              Cancel
                            </Button>
                            {task.canCancelRunning && (
                              <Button
                                variant="contained"
                                disabled={actionLoading}
                                onClick={() => handleReleaseRunning(task)}
                                title="Release after cancelled in RCS"
                                sx={{
                                  borderRadius: "4px",
                                  fontWeight: 900,
                                  minWidth: 44,
                                  bgcolor: "#ed6c02",
                                  "&:hover": { bgcolor: "#c65300" },
                                }}
                              >
                                R
                              </Button>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>

                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={!selectedRobot}
                  onClick={() => navigate(assignUrl)}
                  sx={{
                    mt: 1.5,
                    borderRadius: "4px",
                    fontWeight: 900,
                    fontSize: { xs: 16, md: 18 },
                    py: 1.3,
                  }}
                >
                  Assign
                </Button>
              </>
            )}
          </>
        )}
      </Box>
    </ScreenLayout>
  );
}

export default Status;
