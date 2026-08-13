import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  FormControl,
  IconButton,
  MenuItem,
  Select,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import MapIcon from "@mui/icons-material/Map";
import InventoryIcon from "@mui/icons-material/Inventory";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";
import { fetchConfig, fetchMapDashboard } from "../api/client.js";

const STOCK_META = {
  "-1": {
    label: "Unlimited storage location status",
    color: "#64748b",
    bg: "#f1f5f9",
  },
  0: { label: "empty", color: "#2e7d32", bg: "#e8f5e9" },
  1: {
    label: "Half full storage location",
    color: "#ed6c02",
    bg: "#fff3e0",
  },
  2: { label: "Full storage location", color: "#d32f2f", bg: "#ffebee" },
};
const MAP_FLIP_STORAGE_KEY = "mapDashboardFlipMode";
const MAP_REFRESH_INTERVAL_MS = 5000;

function getStockMeta(status) {
  return STOCK_META[String(status)] || {
    label: "Unknown",
    color: "#475569",
    bg: "#f8fafc",
  };
}

function getNodeColor(node) {
  const stocks = node.stocks || (node.stock ? [node.stock] : []);
  if (!stocks.length) return "#94a3b8";
  if (stocks.some((stock) => Number(stock.inTask) === 1)) return "#7b1fa2";
  if (stocks.some((stock) => Number(stock.stockStatus) === 2)) {
    return getStockMeta(2).color;
  }
  if (stocks.some((stock) => Number(stock.stockStatus) === 1)) {
    return getStockMeta(1).color;
  }
  return getStockMeta(stocks[0].stockStatus).color;
}

function buildTaskPointSet(tasks) {
  const values = new Set();
  tasks.forEach((task) => {
    [task.pickup, task.drop].forEach((point) => {
      if (!point) return;
      [point.name, point.rcsPosition].forEach((value) => {
        if (value) values.add(String(value).toLowerCase());
      });
    });
  });
  return values;
}

function taskMatchesNode(node, taskPointSet) {
  const nodeNames = [node.name, node.content]
    .map((value) => String(value || "").toLowerCase())
    .filter(Boolean);
  return nodeNames.some((name) => taskPointSet.has(name));
}

function getDisplayLocationStatus(stock) {
  if (!stock) return "";
  if (Number(stock.stockStatus) === 0) return "Empty storage location";
  return getStockMeta(stock.stockStatus).label;
}

function NodeDetailDialog({ node, onClose }) {
  const stocks = node?.stocks || (node?.stock ? [node.stock] : []);
  const hasStock = stocks.length > 0;

  return (
    <Dialog
      open={Boolean(node)}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "4px",
          width: { xs: "calc(100% - 24px)", md: 760 },
        },
      }}
    >
      <DialogContent
        sx={{
          p: 0,
          position: "relative",
          bgcolor: "#fff",
        }}
      >
        <IconButton
          aria-label="Close"
          onClick={onClose}
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 2,
          }}
        >
          <CloseIcon />
        </IconButton>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: hasStock ? `310px repeat(${Math.min(stocks.length, 3)}, minmax(280px, 1fr))` : "1fr",
            },
            overflowX: "auto",
          }}
        >
          <Box sx={{ p: { xs: 3, md: 4 } }}>
            <Typography
              sx={{
                fontSize: { xs: 18, md: 21 },
                fontWeight: 900,
                color: "#111827",
                mb: 3,
              }}
            >
              Pallet Node({node?.x},{node?.y})
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: "126px 1fr", rowGap: 2 }}>
              <Typography sx={{ color: "#8a8f98", fontSize: 18 }}>
                Node Name:
              </Typography>
              <Typography sx={{ color: "#111827", fontSize: 18 }}>
                {node?.name || "-"}
              </Typography>

              <Typography sx={{ color: "#8a8f98", fontSize: 18 }}>
                Node:
              </Typography>
              <Typography sx={{ color: "#111827", fontSize: 18 }}>
                {node?.content || "-"}
              </Typography>
            </Box>
          </Box>

          {hasStock &&
            stocks.map((stock) => (
            <Box
              key={`${stock.qrContent}-${stock.areaId}`}
              sx={{
                p: { xs: 3, md: 4 },
                borderLeft: { xs: "none", md: "1px dashed #e5e7eb" },
                borderTop: { xs: "1px dashed #e5e7eb", md: "none" },
                minWidth: { md: 280 },
              }}
            >
              <Typography
                sx={{
                  fontSize: { xs: 18, md: 21 },
                  fontWeight: 900,
                  color: "#111827",
                  mb: 3,
                }}
              >
                Storage Location
              </Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: "150px 1fr", rowGap: 2 }}>
                <Typography sx={{ color: "#8a8f98", fontSize: 18 }}>
                  Location Code:
                </Typography>
                <Typography sx={{ color: "#111827", fontSize: 18 }}>
                  {stock.qrContent || "-"}
                </Typography>

                <Typography sx={{ color: "#8a8f98", fontSize: 18 }}>
                  Location Status:
                </Typography>
                <Typography sx={{ color: "#111827", fontSize: 18 }}>
                  {getDisplayLocationStatus(stock)}
                </Typography>

                <Typography sx={{ color: "#8a8f98", fontSize: 18 }}>
                  Location Direction:
                </Typography>
                <Typography sx={{ color: "#111827", fontSize: 18 }}>
                  {stock.direction ?? 0}°
                </Typography>
              </Box>
            </Box>
            ))}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

function MapCanvas({ data, onNodeOpen, flipMode }) {
  const nodes = data?.map?.nodes || [];
  const lines = data?.map?.lines || [];
  const bounds = data?.map?.bounds || {};
  const tasks = data?.activeTasks || [];
  const taskPointSet = useMemo(() => buildTaskPointSet(tasks), [tasks]);
  const lastTapRef = useRef({ nodeId: null, time: 0 });

  const minX = Number(bounds.minX) || 0;
  const maxX = Number(bounds.maxX) || 1;
  const minY = Number(bounds.minY) || 0;
  const maxY = Number(bounds.maxY) || 1;
  const padding = 1000;
  const width = Math.max(maxX - minX + padding * 2, 1);
  const height = Math.max(maxY - minY + padding * 2, 1);
  const viewBox = `${minX - padding} ${minY - padding} ${width} ${height}`;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const flipX = flipMode === "x" || flipMode === "both";
  const flipY = flipMode === "y" || flipMode === "both";
  const mapTransform = `translate(${centerX} ${centerY}) scale(${flipX ? -1 : 1} ${flipY ? -1 : 1}) translate(${-centerX} ${-centerY})`;

  const handleNodeTouchEnd = (event, node) => {
    event.preventDefault();
    const now = Date.now();
    const lastTap = lastTapRef.current;

    if (lastTap.nodeId === node.id && now - lastTap.time < 360) {
      lastTapRef.current = { nodeId: null, time: 0 };
      onNodeOpen(node);
      return;
    }

    lastTapRef.current = { nodeId: node.id, time: now };
  };

  return (
    <Box
      sx={{
        bgcolor: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "4px",
        overflow: "hidden",
        height: { xs: 420, md: "calc(100vh - 190px)" },
        minHeight: 420,
      }}
    >
      <svg
        viewBox={viewBox}
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ display: "block", background: "#f8fafc" }}
      >
        <g transform={mapTransform}>
          {lines.map((line) => {
            const points = (line.path || [])
              .map(([x, y]) => `${Number(x)},${Number(y)}`)
              .join(" ");
            if (!points) return null;
            return (
              <polyline
                key={line.id}
                points={points}
                fill="none"
                stroke="#cbd5e1"
                strokeWidth="80"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}

          {nodes.map((node) => {
            const hasTask = taskMatchesNode(node, taskPointSet);
            const color = hasTask ? "#7b1fa2" : getNodeColor(node);
            const hasStock = Boolean(node.stock) || Boolean(node.stocks?.length);
            const radius = hasStock || hasTask ? 185 : 95;

            return (
              <g
                key={node.id}
                onDoubleClick={() => onNodeOpen(node)}
                onTouchEnd={(event) => handleNodeTouchEnd(event, node)}
                style={{ cursor: "pointer", touchAction: "manipulation" }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={radius}
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth="40"
                />
              </g>
            );
          })}
        </g>
      </svg>
    </Box>
  );
}

function StatCard({ icon, title, value, color }) {
  return (
    <Box
      sx={{
        bgcolor: "#fff",
        border: "1px solid #e2e8f0",
        borderRadius: "4px",
        p: 1.2,
        minHeight: 76,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.4 }}>
        <Box sx={{ color, display: "flex", "& svg": { fontSize: 18 } }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>
          {title}
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 22, color, fontWeight: 900 }}>
        {value}
      </Typography>
    </Box>
  );
}

function MapDashboard() {
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [areaId, setAreaId] = useState("24");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedNode, setSelectedNode] = useState(null);
  const [flipMode, setFlipMode] = useState(() => {
    return localStorage.getItem(MAP_FLIP_STORAGE_KEY) || "none";
  });
  const refreshInFlightRef = useRef(false);

  useEffect(() => {
    fetchConfig().then((cfg) => {
      setConfig(cfg);
      const firstArea = cfg?.rcs?.find((rcs) => rcs.areaIds?.length)?.areaIds?.[0];
      if (firstArea) setAreaId(String(firstArea));
    });
  }, []);

  const loadDashboard = async ({ silent = false } = {}) => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      if (!silent) setLoading(true);
      setError("");
      const result = await fetchMapDashboard(areaId);
      setData(result);
    } catch (err) {
      setError(err?.message || "Load map failed");
    } finally {
      if (!silent) setLoading(false);
      refreshInFlightRef.current = false;
    }
  };

  const handleFlipModeChange = (_event, nextMode) => {
    if (!nextMode) return;
    setFlipMode(nextMode);
    localStorage.setItem(MAP_FLIP_STORAGE_KEY, nextMode);
  };

  useEffect(() => {
    if (!areaId) return;
    loadDashboard();
  }, [areaId]);

  useEffect(() => {
    if (!areaId) return undefined;

    const timer = setInterval(() => {
      loadDashboard({ silent: true });
    }, MAP_REFRESH_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [areaId]);

  const areaOptions = useMemo(() => {
    const ids = new Set();
    (config?.rcs || []).forEach((rcs) => {
      (rcs.areaIds || []).forEach((id) => ids.add(String(id)));
    });
    if (ids.size === 0) ids.add("24");
    return [...ids];
  }, [config]);

  const stockList = data?.stock?.stockList || [];
  const stockDisplayItems = useMemo(() => {
    const nodes = data?.map?.nodes || [];
    const items = [];
    const seen = new Set();

    nodes.forEach((node) => {
      const stocks = node.stocks || (node.stock ? [node.stock] : []);
      stocks.forEach((stock) => {
        const key = `${stock.qrContent}-${stock.areaId}`;
        seen.add(key);
        items.push({
          ...stock,
          nodeName: node.name || node.content || stock.qrContent,
          nodeCode: node.content,
        });
      });
    });

    stockList.forEach((stock) => {
      const key = `${stock.qrContent}-${stock.areaId}`;
      if (seen.has(key)) return;
      items.push({
        ...stock,
        nodeName: stock.qrContent,
        nodeCode: "",
      });
    });

    return items;
  }, [data?.map?.nodes, stockList]);
  const fullCount = stockList.filter((item) => Number(item.stockStatus) === 2).length;
  const emptyCount = stockList.filter((item) => Number(item.stockStatus) === 0).length;
  const inTaskCount = stockList.filter((item) => Number(item.inTask) === 1).length;

  return (
    <ScreenLayout
      title="MAP DASHBOARD"
      onBack={() => navigate("/")}
      onHome={() => navigate("/")}
      contentMaxWidth={1400}
      headerMaxWidth={1400}
    >
      <Box sx={{ width: "100%", maxWidth: 1400, mx: "auto", p: { xs: 0.5, md: 1 } }}>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: 1.2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <MapIcon sx={{ color: "primary.main" }} />
            <Typography sx={{ color: "primary.main", fontWeight: 900, fontSize: 18 }}>
              AREA MAP MONITOR
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={flipMode}
              onChange={handleFlipModeChange}
              sx={{
                bgcolor: "#fff",
                "& .MuiToggleButton-root": {
                  fontWeight: 900,
                  px: { xs: 1, md: 1.4 },
                },
              }}
            >
              <ToggleButton value="none">Normal</ToggleButton>
              <ToggleButton value="x">Flip X</ToggleButton>
              <ToggleButton value="y">Flip Y</ToggleButton>
              <ToggleButton value="both">Both</ToggleButton>
            </ToggleButtonGroup>
            <FormControl size="small" sx={{ minWidth: 120, bgcolor: "#fff" }}>
              <Select value={areaId} onChange={(event) => setAreaId(event.target.value)}>
                {areaOptions.map((id) => (
                  <MenuItem key={id} value={id}>
                    Area {id}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={loadDashboard}
              disabled={loading}
              sx={{ borderRadius: "4px", fontWeight: 900 }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {error ? (
          <Box sx={{ bgcolor: "#ffebee", color: "#d32f2f", p: 2, borderRadius: "4px", mb: 1 }}>
            {error}
          </Box>
        ) : null}

        {loading && !data ? (
          <Box sx={{ display: "flex", justifyContent: "center", mt: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 360px" },
              gap: 1.2,
            }}
          >
            <MapCanvas
              data={data}
              onNodeOpen={setSelectedNode}
              flipMode={flipMode}
            />

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 1,
                }}
              >
                <StatCard
                  icon={<InventoryIcon />}
                  title="FULL"
                  value={fullCount}
                  color="#d32f2f"
                />
                <StatCard
                  icon={<InventoryIcon />}
                  title="EMPTY"
                  value={emptyCount}
                  color="#2e7d32"
                />
                <StatCard
                  icon={<AssignmentIcon />}
                  title="IN TASK"
                  value={inTaskCount}
                  color="#7b1fa2"
                />
                <StatCard
                  icon={<SmartToyIcon />}
                  title="DEVICES"
                  value={data?.devices?.length || 0}
                  color="#1976d2"
                />
              </Box>

              <Box
                sx={{
                  bgcolor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px",
                  p: 1.2,
                }}
              >
                <Typography sx={{ fontWeight: 900, color: "#334155", mb: 1 }}>
                  LEGEND
                </Typography>
                {Object.entries(STOCK_META).map(([code, meta]) => (
                  <Box
                    key={code}
                    sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.7 }}
                  >
                    <Box
                      sx={{
                        width: 14,
                        height: 14,
                        borderRadius: "50%",
                        bgcolor: meta.color,
                      }}
                    />
                    <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                      {code}: {meta.label}
                    </Typography>
                  </Box>
                ))}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      bgcolor: "#7b1fa2",
                    }}
                  />
                  <Typography sx={{ fontSize: 13, fontWeight: 800 }}>
                    inTask: task triggered at this point
                  </Typography>
                </Box>
              </Box>

              <Box
                sx={{
                  bgcolor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "4px",
                  p: 1.2,
                  maxHeight: { xs: 360, lg: "calc(100vh - 420px)" },
                  overflow: "auto",
                }}
              >
                <Typography sx={{ fontWeight: 900, color: "#334155", mb: 1 }}>
                  STORAGE LOCATIONS ({stockDisplayItems.length})
                </Typography>
                {stockDisplayItems.length === 0 ? (
                  <Typography sx={{ color: "#64748b", fontWeight: 800 }}>
                    No storage status.
                  </Typography>
                ) : (
                  stockDisplayItems.map((item) => {
                    const meta = getStockMeta(item.stockStatus);
                    return (
                      <Box
                        key={`${item.qrContent}-${item.areaId}`}
                        sx={{
                          border: "1px solid #e2e8f0",
                          borderRadius: "4px",
                          p: 1,
                          mb: 0.8,
                          bgcolor: meta.bg,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 1,
                            mb: 0.5,
                          }}
                        >
                          <Typography sx={{ fontWeight: 900, color: "#0f172a" }}>
                            {item.nodeName}
                          </Typography>
                          <Chip
                            label={meta.label}
                            size="small"
                            sx={{
                              bgcolor: "#fff",
                              color: meta.color,
                              fontWeight: 900,
                              maxWidth: 190,
                            }}
                          />
                        </Box>
                        <Typography sx={{ color: "#475569", fontSize: 12, fontWeight: 800 }}>
                          node: {item.qrContent}
                        </Typography>
                        <Typography sx={{ color: "#475569", fontSize: 12, fontWeight: 800 }}>
                          stockStatus: {item.stockStatus} | inTask: {item.inTask}
                        </Typography>
                      </Box>
                    );
                  })
                )}
              </Box>
            </Box>
          </Box>
        )}
        <NodeDetailDialog
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
        />
      </Box>
    </ScreenLayout>
  );
}

export default MapDashboard;
