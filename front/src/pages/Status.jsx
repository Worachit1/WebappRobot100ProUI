import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
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
import RouteIcon from "@mui/icons-material/Route";
import AssignmentIcon from "@mui/icons-material/Assignment";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import WifiIcon from "@mui/icons-material/Wifi";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useNavigate } from "react-router-dom";
import { formatDateTime } from "../config/formatDatetime";

import ScreenLayout from "../components/ScreenLayout.jsx";
import { fetchConfig, fetchRobotStatus } from "../api/client.js";

function InfoCard({
  icon,
  title,
  value,
  color = "#2d49ae",
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
  const color = isError ? "#d32f2f" : "#2e7d32";
  const bg = isError ? "#ffebee" : "#e8f5e9";

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 0.7,
        borderRadius: "999",
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

function Status() {
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [robotId, setRobotId] = useState("");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig().then((data) => {
      setConfig(data);
      if (data.robots?.length) {
        setRobotId(data.robots[0].id);
      }
    });
  }, []);

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
  const latestOrder = status?.latestOrder || null;

  const battery = Number(deviceStatus?.battery ?? 0);
  const safeBattery = Number.isFinite(battery)
    ? Math.max(0, Math.min(100, battery))
    : 0;

  const agvStatus = deviceStatus?.agvStatus || deviceStatus?.state || "-";
  const position = deviceStatus?.devicePosition || "-";
  const charging = deviceStatus?.charging ? "CHARGING" : "NOT CHARGING";

  const orderStatus = latestOrder?.status || "-";

  const orderStatusColor =
    orderStatus === "SUCCESS"
      ? "#2e7d32"
      : orderStatus === "FAILED"
        ? "#d32f2f"
        : "#111827";

  return (
    <ScreenLayout
      title="สถานะหุ่นยนต์"
      onBack={() => navigate("/")}
      onHome={() => navigate("/")}
      contentMaxWidth={1180}
      headerMaxWidth={1180}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1180,
          mx: "auto",
          p: { xs: 0.5, md: 1 },
        }}
      >
        <Typography
          sx={{
            width: "100%",
            textAlign: "center",
            color: "#2d49ae",
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
                onChange={(e) => setRobotId(e.target.value)}
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
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <SmartToyIcon sx={{ fontSize: 90, color: "#2d49ae" }} />
                      )}
                    </Box>

                    <Typography
                      sx={{
                        fontSize: { xs: 16, md: 18 },
                        fontWeight: 900,
                        color: "#2d49ae",
                      }}
                    >
                      {selectedRobot?.name || status?.robot?.name || "-"}
                    </Typography>

                    <Box sx={{ mt: 1.5 }}>
                      <StatusBadge
                        status={agvStatus}
                        error={deviceStatus?.error}
                      />
                    </Box>
                  </Box>

                  <Box>
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
                        <Typography
                          sx={{
                            color: "#d32f2f",
                            fontSize: 22,
                            fontWeight: 900,
                            mb: 1,
                          }}
                        >
                          RCS ERROR
                        </Typography>

                        <Typography sx={{ color: "#d32f2f", fontWeight: 700 }}>
                          {deviceStatus.error}
                        </Typography>

                        {deviceStatus?.url && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{
                              display: "block",
                              mt: 2,
                              wordBreak: "break-all",
                            }}
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
                          color="#2e7d32"
                        />

                        <InfoCard
                          icon={<LocationOnIcon />}
                          title="POSITION"
                          value={position}
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
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <Box
                              sx={{
                                width: 26,
                                height: 26,
                                "& svg": { fontSize: 17 },
                                borderRadius: "50%",
                                bgcolor: "#2d49ae18",
                                color: "#2d49ae",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <BatteryFullIcon />
                            </Box>

                            <Typography
                              sx={{ fontWeight: 900, color: "#667085" }}
                            >
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
                          color={deviceStatus?.charging ? "#2e7d32" : "#6b7280"}
                        />
                      </Box>
                    )}
                  </Box>
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
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 1,
                    }}
                  >
                    <AssignmentIcon sx={{ color: "#2d49ae" }} />
                    <Typography
                      sx={{
                        color: "#2d49ae",
                        fontWeight: 900,
                        fontSize: { xs: 14, md: 16 },
                      }}
                    >
                      CURRENT ORDER
                    </Typography>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: {
                        xs: "1fr",
                        md: "1fr 1.4fr 1fr 1fr",
                      },
                      gap: 1,
                    }}
                  >
                    <InfoCard
                      icon={<AssignmentIcon />}
                      title="ORDER ID"
                      value={latestOrder?.orderId || "-"}
                      color="#2d49ae"
                    />

                    <InfoCard
                      icon={<RouteIcon />}
                      title="ROUTE"
                      value={`${latestOrder?.pickup?.name || "-"} → ${
                        latestOrder?.drop?.name || "-"
                      }`}
                      color="#7b1fa2"
                    />

                    <InfoCard
                      icon={<AccessTimeIcon />}
                      title="START"
                      value={formatDateTime(latestOrder?.startedAt) || "-"}
                      color="#0288d1"
                    />

                    <InfoCard
                      icon={<TaskAltIcon />}
                      title="ORDER STATUS"
                      value={orderStatus}
                      valueColor={orderStatusColor}
                      color={orderStatusColor}
                    />
                  </Box>
                </Box>
              </>
            )}
          </>
        )}
      </Box>
    </ScreenLayout>
  );
}

export default Status;
