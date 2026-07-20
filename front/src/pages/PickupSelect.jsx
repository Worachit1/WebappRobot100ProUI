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
import {
  fetchSport,
  fetchConfig,
  createOrder,
  createOrderTuskrobot,
} from "../api/client.js";

function PickupSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const robotId = searchParams.get("robotId") || "";
  const robotName = searchParams.get("robotName") || "";

  const [pickupPoints, setPickupPoints] = useState([]);
  const [pickupId, setPickupId] = useState("");

  const [dropId, setDropId] = useState("");
  const [robot, setRobot] = useState(null);
  const [modelProcessType, setModelProcessType] = useState("");
  const [confirmLoading, setConfirmLoading] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!robotId) {
      setLoading(false);
      return;
    }

    Promise.all([fetchSport(robotId), fetchConfig()])
      .then(([spotRes, config]) => {
        setPickupPoints(spotRes?.data || []);

        const foundRobot = (config?.robots || []).find(
          (item) => String(item.id) === String(robotId),
        );

        setRobot(foundRobot || null);

        const entries = Object.entries(foundRobot?.modelProcessCode || {});
        if (entries.length === 1) {
          setModelProcessType(entries[0][0]);
        }
      })
      .finally(() => setLoading(false));
  }, [robotId]);

  const selectedPickup = useMemo(() => {
    return pickupPoints.find((item) => item.id === pickupId) || null;
  }, [pickupPoints, pickupId]);

  const availableDropPoints = useMemo(() => {
    return pickupPoints.filter((item) => String(item.id) !== String(pickupId));
  }, [pickupPoints, pickupId]);

  const selectedDrop = useMemo(() => {
    return (
      availableDropPoints.find((item) => String(item.id) === String(dropId)) ||
      null
    );
  }, [availableDropPoints, dropId]);

  const modelProcessOptions = useMemo(() => {
    return Object.entries(robot?.modelProcessCode || {}).map(
      ([type, code]) => ({
        type,
        code,
      }),
    );
  }, [robot]);

  const selectedModelProcess = useMemo(() => {
    return (
      modelProcessOptions.find((item) => item.type === modelProcessType) || null
    );
  }, [modelProcessOptions, modelProcessType]);

  const isSingleOption = modelProcessOptions.length === 1;

  const handleConfirm = async () => {
    if (!robotId || !selectedPickup || !selectedDrop || !selectedModelProcess) {
      return;
    }

    const confirmResult = await Swal.fire({
      title: "Create Order ?",
      html: `
      <div style="text-align:left">
        <p><b>Robot:</b> ${robotName}</p>
        <p><b>Pick Up:</b> ${selectedPickup.name}</p>
        <p><b>Drop Off:</b> ${selectedDrop.name}</p>
        <p><b>Task:</b> ${selectedModelProcess.code}</p>
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
      setConfirmLoading(true);

      const orderPayload = {
        robotId,
        pickupId: selectedPickup.id,
        dropId: selectedDrop.id,
        modelProcessType: selectedModelProcess.type,
        modelProcessCode: selectedModelProcess.code,
      };

      const res =
        String(robotId) === "e10"
          ? await createOrderTuskrobot(orderPayload)
          : await createOrder(orderPayload);

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
      setConfirmLoading(false);
    }
  };
  return (
    <ScreenLayout
      title="เลือกจุดต้นทาง"
      onBack={() => navigate("/select-robot")}
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
          PICK UP SELECT
        </Typography>

        <Box sx={{ border: "1px solid #ddd", p: 2, mb: 3 }}>
          <Typography sx={{ fontSize: { xs: 18, md: 20 } }}>
            <b>Robot:</b> {robotName || "-"}
          </Typography>
        </Box>

        {loading ? (
          <CircularProgress />
        ) : (
          <>
            <Typography
              fontWeight={900}
              sx={{
                fontSize: { xs: 18, md: 20 },
                mb: 1.5,
              }}
            >
              PICK UP
            </Typography>

            <Select
              fullWidth
              value={pickupId}
              displayEmpty
              onChange={(e) => {
                setPickupId(e.target.value);
                setDropId("");
              }}
              sx={{
                mb: { xs: 3, md: 5 },
                height: { xs: 56, md: 70 },
                fontSize: { xs: 18, md: 20 },
                borderRadius: "4px",
              }}
            >
              <MenuItem value="" disabled sx={{ fontSize: { xs: 18, md: 20 } }}>
                <em>---Pick Up Select---</em>
              </MenuItem>

              {pickupPoints.map((item) => (
                <MenuItem
                  key={item.id}
                  value={item.id}
                  sx={{ fontSize: { xs: 18, md: 20 } }}
                >
                  {item.name}
                </MenuItem>
              ))}
            </Select>

            {selectedPickup && (
              <>
                <Typography
                  fontWeight={900}
                  sx={{
                    fontSize: { xs: 18, md: 20 },
                    mb: 1.5,
                  }}
                >
                  DROP OFF
                </Typography>

                <Select
                  fullWidth
                  value={dropId}
                  displayEmpty
                  onChange={(e) => setDropId(e.target.value)}
                  sx={{
                    mb: { xs: 3, md: 5 },
                    height: { xs: 56, md: 70 },
                    fontSize: { xs: 18, md: 20 },
                    borderRadius: "4px",
                  }}
                >
                  <MenuItem
                    value=""
                    disabled
                    sx={{ fontSize: { xs: 18, md: 20 } }}
                  >
                    <em>---Drop Off Select---</em>
                  </MenuItem>

                  {availableDropPoints.map((item) => (
                    <MenuItem
                      key={item.id}
                      value={item.id}
                      sx={{ fontSize: { xs: 18, md: 20 } }}
                    >
                      {item.name}
                    </MenuItem>
                  ))}
                </Select>
              </>
            )}

            {selectedDrop && (
              <>
                <Typography
                  fontWeight={900}
                  sx={{
                    fontSize: { xs: 18, md: 20 },
                    mb: 1.5,
                  }}
                >
                  MODEL PROCESS TASK
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
                  <MenuItem
                    value=""
                    disabled
                    sx={{ fontSize: { xs: 18, md: 20 } }}
                  >
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
              </>
            )}

            {selectedPickup && selectedDrop && (
              <Box sx={{ border: "1px solid #ddd", p: 1, mb: 3 }}>
                <Typography sx={{ fontSize: { xs: 18, md: 20 } }}>
                  <b>Pick Up:</b> {selectedPickup.name}
                </Typography>
                <Typography sx={{ fontSize: { xs: 18, md: 20 } }}>
                  <b>Drop OFF:</b> {selectedDrop.name}
                </Typography>
              </Box>
            )}
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={
                !selectedPickup ||
                !selectedDrop ||
                !selectedModelProcess ||
                !robotId ||
                confirmLoading
              }
              onClick={handleConfirm}
              sx={{
                fontWeight: 900,
                borderRadius: "4px",
              }}
            >
              {confirmLoading ? "Confirming..." : "Confirm"}
            </Button>
          </>
        )}
      </Box>
    </ScreenLayout>
  );
}

export default PickupSelect;
