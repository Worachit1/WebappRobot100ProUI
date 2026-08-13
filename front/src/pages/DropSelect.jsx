import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";
import { fetchSport } from "../api/client.js";

function DropSelect() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const robotId = searchParams.get("robotId") || "";
  const robotName = searchParams.get("robotName") || "";
  const pickupId = searchParams.get("pickupId") || "";
  const pickupName = searchParams.get("pickupName") || "";
  const pickupRcs = searchParams.get("pickupRcs") || "";

  const [dropPoints, setDropPoints] = useState([]);
  const [dropId, setDropId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!robotId) {
      setLoading(false);
      return;
    }

    fetchSport(robotId)
      .then((res) => {
        setDropPoints(res?.data || []);
      })
      .finally(() => setLoading(false));
  }, [robotId]);
  
  const availableDropPoints = useMemo(() => {
    return dropPoints.filter((item) => String(item.id) !== String(pickupId));
  }, [dropPoints, pickupId]);

  const selectedDrop = useMemo(() => {
    return (
      availableDropPoints.find((item) => String(item.id) === String(dropId)) ||
      null
    );
  }, [availableDropPoints, dropId]);

  const handleNext = () => {
    if (!robotId || !pickupId || !selectedDrop) return;

    navigate(
      `/select-model-process?robotId=${encodeURIComponent(
        robotId,
      )}&robotName=${encodeURIComponent(
        robotName,
      )}&pickupId=${encodeURIComponent(
        pickupId,
      )}&pickupName=${encodeURIComponent(
        pickupName,
      )}&pickupRcs=${encodeURIComponent(pickupRcs)}&dropId=${encodeURIComponent(
        selectedDrop.id,
      )}&dropName=${encodeURIComponent(
        selectedDrop.name,
      )}&dropRcs=${encodeURIComponent(selectedDrop.rcsPosition || "")}`,
    );
  };

  const handleBack = () => {
    navigate(
      `/pickup-select?robotId=${encodeURIComponent(
        robotId,
      )}&robotName=${encodeURIComponent(robotName)}`,
    );
  };

  return (
    <ScreenLayout
      title="เลือกจุดปลายทาง"
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
            color: "primary.main",
            fontSize: 20,
            fontWeight: 900,
            border: "1px solid #000",
            mb: 3,
            py: 0.5,
            boxSizing: "border-box",
          }}
        >
          DROP OFF SELECT
        </Typography>

        <Box sx={{ border: "1px solid #ddd", p: 2, mb: 3 }}>
          <Typography sx={{ fontSize: { xs: 18, md: 20 } }}>
            <b>Robot:</b> {robotName || "-"}
          </Typography>
          <Typography sx={{ fontSize: { xs: 18, md: 20 } }}>
            <b>Pick Up:</b> {pickupName || "-"}
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
              <MenuItem value="" disabled sx={{ fontSize: { xs: 18, md: 20 } }}>
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

            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={!selectedDrop || !robotId}
              onClick={handleNext}
              sx={{ fontWeight: 900, borderRadius: "4px" }}
            >
              Next
            </Button>
          </>
        )}
      </Box>
    </ScreenLayout>
  );
}

export default DropSelect;
