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
import Pagination from "../components/Pagination.jsx";

const defaultRowsPerPage = 5;

const STATUS_COLORS = {
  SUCCESS: "success",
  COMPLETED: "success",
  FAILED: "error",
  SENDING: "info",
  SEND_SUCCESS: "success",
  CANCELLED: "default",
  QUEUED: "info",
  DELAYING: "warning",
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
        <Typography variant="body2">
          Order ID : {item.orderId || "-"}
        </Typography>

        <Typography variant="body2">Robot : {item.robotName || "-"}</Typography>

        <Typography variant="body2">
          Description : {item.pickup?.name || "-"} → {item.drop?.name || "-"}
        </Typography>

        <Typography variant="body2">
          Create At : {formatDateTime(item.startedAt) || "-"}
        </Typography>

        <Typography variant="body2">
          Status Robot : {item.status || "-"}
        </Typography>
      </Box>

      <Chip label={item.status || "-"} color={chipColor} size="small" />
    </Box>
  );
}

function History() {
  const navigate = useNavigate();

  const [status, setStatus] = useState("ALL");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const rowsPerPage = defaultRowsPerPage;

  useEffect(() => {
    setLoading(true);

    fetchHistory({
      status: status === "ALL" ? "" : status,
      q: query.trim(),
      page,
      limit: rowsPerPage,
    })
      .then((data) => {
        console.log("history response:", data);

        setItems(data?.items || []);
        setTotalItems(data?.pagination?.totalItems || 0);
      })
      .catch((err) => {
        console.error("fetch history error:", err);
        setItems([]);
        setTotalItems(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [status, query, page]);

  const handleQueryChange = (event) => {
    setPage(1);
    setQuery(event.target.value);
  };

  const handleStatusChange = (event) => {
    setPage(1);
    setStatus(event.target.value);
  };

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
          sx={{
            width: "100%",
            mx: "auto",
            mt: "5px",
            p: "12px",
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

          <Box
            sx={{
              display: "flex",
              flexDirection: {
                xs: "column",
                sm: "row",
              },
              width: "100%",
              gap: 2,
              mb: 3,
            }}
          >
            <TextField
              fullWidth
              size="small"
              placeholder="Search"
              value={query}
              onChange={handleQueryChange}
            />

            <Select
              size="small"
              value={status}
              onChange={handleStatusChange}
              sx={{
                minWidth: {
                  xs: "100%",
                  sm: 160,
                },
              }}
            >
              <MenuItem value="ALL">All</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
              <MenuItem value="SUCCESS">Success</MenuItem>
              <MenuItem value="CANCELLED">Cancelled</MenuItem>
              <MenuItem value="FAILED">Failed</MenuItem>
              <MenuItem value="DELAYING">Delaying</MenuItem>
              <MenuItem value="QUEUED">Queued</MenuItem>
            </Select>
          </Box>

          {loading ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                py: 5,
              }}
            >
              <CircularProgress />
            </Box>
          ) : items.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
              sx={{ py: 5 }}
            >
              ไม่มีรายการ
            </Typography>
          ) : (
            <>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  width: "100%",
                }}
              >
                {items.map((item, index) => (
                  <HistoryCard
                    key={item.orderId || `${page}-${index}`}
                    item={item}
                  />
                ))}
              </Box>

              <Pagination
                page={page}
                totalItems={totalItems}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
              />
            </>
          )}
        </Box>
      </Box>
    </ScreenLayout>
  );
}

export default History;
