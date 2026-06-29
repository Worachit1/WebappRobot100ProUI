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
import { fetchSport } from "../api/client.js";

function PickupSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const robotId = searchParams.get("robotId") || "";
  const robotName = searchParams.get("robotName") || "";

  const [pickupPoints, setPickupPoints] = useState([]);
  const [pickupId, setPickupId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!robotId) {
      setLoading(false);
      return;
    }

    fetchSport(robotId)
      .then((res) => {
        setPickupPoints(res?.data || []);
      })
      .finally(() => setLoading(false));
  }, [robotId]);

  const selectedPickup = useMemo(() => {
    return pickupPoints.find((item) => item.id === pickupId) || null;
  }, [pickupPoints, pickupId]);

  const handleNext = () => {
    if (!robotId || !selectedPickup) return;

    navigate(
      `/drop-select?robotId=${encodeURIComponent(
        robotId,
      )}&robotName=${encodeURIComponent(
        robotName,
      )}&pickupId=${encodeURIComponent(
        selectedPickup.id,
      )}&pickupName=${encodeURIComponent(
        selectedPickup.name,
      )}&pickupRcs=${encodeURIComponent(selectedPickup.rcsPosition || "")}`,
    );
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
              onChange={(e) => setPickupId(e.target.value)}
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
              <Box sx={{ border: "1px solid #ddd", p: 1, mb: 3 }}>
                <Typography sx={{ fontSize: { xs: 18, md: 20 } }}>
                  <b>Pick Up:</b> {selectedPickup.name}
                </Typography>
              </Box>
            )}

            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={!selectedPickup || !robotId}
              onClick={handleNext}
              sx={{
                fontWeight: 900,
                borderRadius: "4px",
              }}
            >
              Next
            </Button>
          </>
        )}
      </Box>
    </ScreenLayout>
  );
}

export default PickupSelect;
