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
  const [useDelay, setUseDelay] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(30);
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

  // อตั้งค่า default modelProcessType เป็น "delivery" ถ้า robot มี modelProcessCode "delivery"
  // const [modelProcessType, setModelProcessType] = useState("delivery");

  // useEffect(() => {
  //   if (!robotId) {
  //     setLoading(false);
  //     return;
  //   }

  //   Promise.all([fetchSport(robotId), fetchConfig()])
  //     .then(([spotRes, config]) => {
  //       setPickupPoints(spotRes?.data || []);

  //       const foundRobot = (config?.robots || []).find(
  //         (item) => String(item.id) === String(robotId),
  //       );

  //       setRobot(foundRobot || null);

  //       const entries = Object.entries(foundRobot?.modelProcessCode || {});

  //       if (foundRobot?.modelProcessCode?.delivery) {
  //         setModelProcessType("delivery");
  //       } else if (entries.length > 0) {
  //         setModelProcessType(entries[0][0]);
  //       }
  //     })
  //     .finally(() => setLoading(false));
  // }, [robotId]);

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
  const selectedDelaySeconds = useDelay ? delaySeconds : 0;
  const delayMinutesText =
    selectedDelaySeconds === 0
      ? "0 minutes"
      : selectedDelaySeconds % 60 === 0
        ? `${selectedDelaySeconds / 60} minutes`
        : `${Math.floor(selectedDelaySeconds / 60)} minutes 30 seconds`;

  const decreaseDelay = () => {
    setDelaySeconds((current) => Math.max(current - 30, 30));
  };

  const increaseDelay = () => {
    setDelaySeconds((current) => Math.min(current + 30, 600));
  };

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
        <p><b>Delay:</b> ${delayMinutesText}</p>
      </div>
    `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Confirm",
      confirmButtonColor:
        getComputedStyle(document.documentElement)
          .getPropertyValue("--app-theme-color")
          .trim() || "#2d49ae",
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
        delaySeconds: selectedDelaySeconds,
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

      navigate("/status", {
        state: {
          orderId: res.orderId,
          robotId,
          robotName,
        },
      });
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
            color: "primary.main",
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
                  TASK
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
                    <em>---Task Select---</em>
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

                <Typography
                  fontWeight={900}
                  sx={{
                    fontSize: { xs: 18, md: 20 },
                    mb: 1.5,
                  }}
                >
                  DELAY BEFORE SEND RCS
                </Typography>

                <Box
                  sx={{
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                    p: 2,
                    mb: { xs: 3, md: 5 },
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      fullWidth
                      variant={!useDelay ? "contained" : "outlined"}
                      onClick={() => setUseDelay(false)}
                      sx={{
                        borderRadius: "4px",
                        fontWeight: 900,
                        boxShadow: !useDelay
                          ? "10px 5px 20px rgba(45, 73, 174, 0.35)"
                          : "none",
                      }}
                    >
                      Not Delay
                    </Button>

                    <Button
                      fullWidth
                      variant={useDelay ? "contained" : "outlined"}
                      onClick={() => setUseDelay(true)}
                      sx={{
                        borderRadius: "4px",
                        fontWeight: 900,
                        boxShadow: useDelay
                          ? "0 6px 18px rgba(45, 73, 174, 0.35)"
                          : "none",

                      }}
                    >
                      Delay
                    </Button>
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "52px 1fr 52px",
                      gap: 1,
                      alignItems: "center",
                    }}
                  >
                    <Button
                      variant="outlined"
                      disabled={!useDelay || delaySeconds <= 30}
                      onClick={decreaseDelay}
                      sx={{ minWidth: 52, fontWeight: 900 }}
                    >
                      -
                    </Button>
                    <Typography
                      sx={{
                        textAlign: "center",
                        fontSize: { xs: 18, md: 20 },
                        fontWeight: 900,
                      }}
                    >
                      {delayMinutesText}
                    </Typography>
                    <Button
                      variant="outlined"
                      disabled={!useDelay || delaySeconds >= 600}
                      onClick={increaseDelay}
                      sx={{ minWidth: 52, fontWeight: 900 }}
                    >
                      +
                    </Button>
                  </Box>
                </Box>
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
