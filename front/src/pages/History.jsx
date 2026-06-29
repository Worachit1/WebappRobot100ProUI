import React, { useEffect, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";
import { fetchHistory } from "../api/client.js";
import { formatDateTime } from "../config/formatDatetime.js";

const STATUS_COLORS = {
  COMPLETED: "success",
  CANCELLED: "error",
  RUNNING: "warning",
  QUEUED: "default",
  SUCCESS: "success",
  FAILED: "error",
  EXECUTION_FAILED: "error",
  SENDING: "warning",
};

function HistoryCard({ item }) {
  const chipColor = STATUS_COLORS[item.status] || "default";
  return (
    <Box
      sx={{
        width: "100%",
        borderRadius: 2,
        border: "2px solid #111",
        p: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 2,
      }}
    >
      <Box>
        <Typography variant="body2">Order ID : {item.orderId}</Typography>
        <Typography variant="body2">
          Description : {item.pickup?.name} → {item.drop?.name}
        </Typography>
        <Typography variant="body2">
          Create At : {formatDateTime(item.startedAt) || "-"}
        </Typography>
        <Typography variant="body2">Statsu Robot : {item.status}</Typography>
      </Box>
      <Chip label={item.status} color={chipColor} size="small" />
    </Box>
  );
}

function History() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchHistory({ status, q: query })
      .then((data) => setItems(data))
      .finally(() => setLoading(false));
  }, [status, query]);

  return (
    <ScreenLayout
      title="ประวัติการสั่งงาน"
      onBack={() => navigate("/")}
      onHome={() => navigate("/")}
    >
      <Box
        sx={{
          width: "100%",
          minHeight: "80vh",
          p: 2,
        }}
      >
        <Box
        fullWidth
          sx={{
            mx: "auto",
            p: 2,
            marginTop: "5px",
            padding: "12px",
          }}
        >
          <Typography
            sx={{
              textAlign: "center",
              color: "#0066c0",
              fontSize: "20px",
              fontWeight: 900,
              border: "2px solid #000",
              mb: 3,
            }}
          >
            HISTORY
          </Typography>

          <Box sx={{ display: "flex", width: "100%", gap: 2, m: 2 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select
              size="small"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="SUCCESS">Success</MenuItem>
              <MenuItem value="FAILED">Failed</MenuItem>
              {/* <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="CANCELLED">Cancel</MenuItem>
              <MenuItem value="RUNNING">On Task</MenuItem> */}
            </Select>
          </Box>
          {loading ? (
            <CircularProgress />
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                width: "100%",
              }}
            >
              {items.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Not Found
                </Typography>
              ) : (
                items.map((item) => (
                  <HistoryCard key={item.orderId} item={item} />
                ))
              )}
            </Box>
          )}
        </Box>
      </Box>
    </ScreenLayout>
  );
}

export default History;
