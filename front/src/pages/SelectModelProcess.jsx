import { useEffect, useMemo, useRef, useState } from "react";
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
import { createOrder, fetchConfig } from "../api/client.js";

function SelectModelProcess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const robotId = searchParams.get("robotId") || "";
  const robotName = searchParams.get("robotName") || "";
  const pickupId = searchParams.get("pickupId") || "";
  const pickupName = searchParams.get("pickupName") || "";
  const pickupRcs = searchParams.get("pickupRcs") || "";
  const dropId = searchParams.get("dropId") || "";
  const dropName = searchParams.get("dropName") || "";
  const dropRcs = searchParams.get("dropRcs") || "";

  const [robot, setRobot] = useState(null);
  const [modelProcessType, setModelProcessType] = useState("");
  const [loading, setLoading] = useState(true);
  const [confirmLoading, setConfirmLoading] = useState(false);

  const confirmLockRef = useRef(false);

  useEffect(() => {
    fetchConfig()
      .then((config) => {
        const foundRobot = (config?.robots || []).find(
          (item) => String(item.id) === String(robotId),
        );

        setRobot(foundRobot || null);

        const codes = foundRobot?.modelProcessCode || {};
        const entries = Object.entries(codes);

        if (entries.length === 1) {
          setModelProcessType(entries[0][0]);
        }
      })
      .finally(() => setLoading(false));
  }, [robotId]);

  const modelProcessOptions = useMemo(() => {
    return Object.entries(robot?.modelProcessCode || {}).map(([type, code]) => ({
      type,
      code,
    }));
  }, [robot]);

  const selectedModelProcess = useMemo(() => {
    return (
      modelProcessOptions.find((item) => item.type === modelProcessType) || null
    );
  }, [modelProcessOptions, modelProcessType]);

  const isSingleOption = modelProcessOptions.length === 1;

  const handleConfirm = async () => {
    if (!robotId || !pickupId || !dropId || !selectedModelProcess) return;
    if (confirmLockRef.current) return;

    const confirmResult = await Swal.fire({
      title: "Create Order ?",
      html: `
        <div style="text-align:left">
          <p><b>Robot:</b> ${robotName}</p>
          <p><b>Pick Up:</b> ${pickupName}</p>
          <p><b>Drop Off:</b> ${dropName}</p>
          <p><b>Process:</b> ${selectedModelProcess.type}</p>
          <p><b>modelProcessCode:</b> ${selectedModelProcess.code}</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirm",
      confirmButtonColor: "#2d49ae",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!confirmResult.isConfirmed) return;

    try {
      confirmLockRef.current = true;
      setConfirmLoading(true);

      const res = await createOrder({
        robotId,
        pickupId,
        dropId,
        modelProcessType: selectedModelProcess.type,
        modelProcessCode: selectedModelProcess.code,
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

      navigate("/");
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "ERROR",
        text: err?.message || "Create Order Failed",
      });
    } finally {
      confirmLockRef.current = false;
      setConfirmLoading(false);
    }
  };

  const handleBack = () => {
    navigate(
      `/drop-select?robotId=${encodeURIComponent(
        robotId,
      )}&robotName=${encodeURIComponent(
        robotName,
      )}&pickupId=${encodeURIComponent(
        pickupId,
      )}&pickupName=${encodeURIComponent(
        pickupName,
      )}&pickupRcs=${encodeURIComponent(pickupRcs)}`,
    );
  };

  return (
    <ScreenLayout
      title="เลือก Process"
      onBack={handleBack}
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
            color: "#2d49ae",
            fontSize: 20,
            fontWeight: 900,
            border: "1px solid #000",
            mb: 3,
            py: 0.5,
            boxSizing: "border-box",
          }}
        >
          MODEL PROCESS SELECT
        </Typography>

        <Box sx={{ border: "1px solid #ddd", p: 2, mb: 3 }}>
          <Typography sx={{ fontSize: { xs: 18, md: 20 } }}>
            <b>Robot:</b> {robotName || "-"}
          </Typography>
          <Typography sx={{ fontSize: { xs: 18, md: 20 } }}>
            <b>Pick Up:</b> {pickupName || "-"}
          </Typography>
          <Typography sx={{ fontSize: { xs: 18, md: 20 } }}>
            <b>Drop Off:</b> {dropName || "-"}
          </Typography>
        </Box>

        {loading ? (
          <CircularProgress />
        ) : (
          <>
            <Typography
              fontWeight={900}
              sx={{ fontSize: { xs: 18, md: 20 }, mb: 1.5 }}
            >
              MODEL PROCESS
            </Typography>

            <Select
              fullWidth
              value={modelProcessType}
              displayEmpty
              disabled={isSingleOption}
              onChange={(e) => setModelProcessType(e.target.value)}
              sx={{
                mb: { xs: 3, md: 5 },
                height: { xs: 56, md: 70 },
                fontSize: { xs: 18, md: 20 },
                borderRadius: "4px",
              }}
            >
              <MenuItem value="" disabled sx={{ fontSize: { xs: 18, md: 20 } }}>
                <em>---Model Process Select---</em>
              </MenuItem>

              {modelProcessOptions.map((item) => (
                <MenuItem
                  key={item.type}
                  value={item.type}
                  sx={{ fontSize: { xs: 18, md: 20 } }}
                >
                 {item.code}
                </MenuItem>
              ))}
            </Select>

            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={!selectedModelProcess || confirmLoading}
              onClick={handleConfirm}
              sx={{ fontWeight: 900, borderRadius: "4px" }}
            >
              {confirmLoading ? "Confirming..." : "Confirm"}
            </Button>
          </>
        )}
      </Box>
    </ScreenLayout>
  );
}

export default SelectModelProcess;