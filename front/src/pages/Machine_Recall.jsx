import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import Swal from "sweetalert2";
import { useNavigate, useSearchParams } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";
import { fetchSport, createOrderRecall } from "../api/client.js";

function Machine_Recall() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const machineId = searchParams.get("machineId") || "";
  const machineName = searchParams.get("machineName") || "";

  const [buffers, setBuffers] = useState([]);
  const [bufferId, setBufferId] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    fetchSport()
      .then((res) => {
        setBuffers(res?.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // filter buffers
  const availableBuffers = useMemo(() => {
    const allowIds = ["bu1-01", "bu1-02", "bu1-03", "bu1-04", "bu1-05"];

    return buffers.filter((item) => allowIds.includes(item.id));
  }, [buffers]);

  const selectedBuffer = useMemo(() => {
    return availableBuffers.find((item) => item.id === bufferId) || null;
  }, [availableBuffers, bufferId]);

  const handleConfirm = async () => {
    if (!machineId || !selectedBuffer || confirmLoading) return;

    const confirmResult = await Swal.fire({
      title: "Create Recall Order ?",
      html: `
    <div style="text-align:left">
      <p><b>Pick Machine:</b> ${machineName}</p>
      <p><b>Drop Buffer:</b> ${selectedBuffer.name}</p>
    </div>
  `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirm",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });
    if (!confirmResult.isConfirmed) return;

    try {
      setConfirmLoading(true);

      const res = await createOrderRecall({
        machineId,
        bufferId: selectedBuffer.id,
        robotId: "c100",
      });

      await Swal.fire({
        icon: "success",
        title: "Order Created",
        html: `
          <div style="text-align:left">
            <p><b>Order ID:</b> ${res.orderId}</p>
            <p><b>Status:</b> ${res.status}</p>
          </div>
        `,
      });

      navigate("/machine-drop");
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ERROR",
        text: err?.message || "Create Order Failed",
      });
    } finally {
      setConfirmLoading(false);
    }
  };

  const onBack = () => {
    navigate(
      `/machine-select-drop-or-takeback?machineId=${encodeURIComponent(
        machineId,
      )}&machineName=${encodeURIComponent(machineName)}`,
    );
  };

  return (
    <ScreenLayout
      title="Machine Buffer Drop"
      onBack={onBack}
      onHome={() => navigate("/")}
      contentMaxWidth={900}
      headerMaxWidth={900}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: { xs: 420, md: 900 },
          mx: "auto",
          p: { xs: 2, md: 3 },
        }}
      >
        <Typography
          sx={{
            width: "100%",
            textAlign: "center",
            color: "#eb521d",
            fontSize: { xs: 20, md: 34 },
            fontWeight: 900,
            border: "2px solid #000",
            mb: { xs: 3, md: 5 },
            py: { xs: 0.5, md: 1.5 },
            boxSizing: "border-box",
          }}
        >
          RECALL RACK BUFFERS
        </Typography>

        <Box sx={{ border: "1px solid #ddd", p: 2, mb: 3 }}>
          <Typography
            sx={{
              fontSize: { xs: 18, md: 28 },
              mb: 1.5,
            }}
          >
            <b>Pick Machine:</b> {machineName || "-"}
          </Typography>
        </Box>

        {loading ? (
          <CircularProgress />
        ) : (
          <>
            <Typography
              fontWeight={900}
              sx={{
                fontSize: { xs: 18, md: 28 },
                mb: 1.5,
              }}
            >
              Buffers
            </Typography>

            <Select
              fullWidth
              value={bufferId}
              displayEmpty
              onChange={(e) => setBufferId(e.target.value)}
              sx={{
                mb: { xs: 3, md: 5 },
                height: { xs: 56, md: 82 },
                fontSize: { xs: 18, md: 30 },
                borderRadius: "4px",
              }}
            >
              <MenuItem value="" disabled sx={{ fontSize: { xs: 18, md: 28 } }}>
                <em>---Select Buffer---</em>
              </MenuItem>

              {availableBuffers.map((item) => (
                <MenuItem
                  key={item.id}
                  value={item.id}
                  sx={{ fontSize: { xs: 18, md: 22 } }}
                >
                  {item.name}
                </MenuItem>
              ))}
            </Select>

            {selectedBuffer && (
              <Box sx={{ border: "1px solid #ddd", p: 1, mb: 3 }}>
                <Typography
                  sx={{
                    mb: { xs: 3, md: 5 },
                    height: { xs: 56, md: 82 },
                    fontSize: { xs: 18, md: 30 },
                    borderRadius: "4px",
                  }}
                >
                  <b>Drop Buffer:</b> {selectedBuffer.name}
                </Typography>
              </Box>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={!selectedBuffer || !machineId || confirmLoading}
              onClick={handleConfirm}
            >
              {confirmLoading ? "Confirming..." : "Confirm"}
            </Button>
          </>
        )}
      </Box>
    </ScreenLayout>
  );
}

export default Machine_Recall;
