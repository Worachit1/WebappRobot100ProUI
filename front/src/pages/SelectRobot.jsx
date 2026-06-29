import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  ButtonBase,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";
import { fetchConfig } from "../api/client.js";

function RobotCard({ robot, selected, onSelect }) {
  return (
    <ButtonBase
      onClick={() => onSelect(robot)}
      disableRipple
      disableTouchRipple
      focusRipple={false}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        borderRadius: 2,

        "&.Mui-focusVisible": {
          outline: "none",
        },
      }}
    >
      <Box
        sx={{
          width: { xs: 120, md: 160 },
          height: { xs: 120, md: 160 },
          borderRadius: "50%",
          border: "3px solid",
          borderColor: selected ? "#2d49ae" : "transparent",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#f6f6f6",
          overflow: "hidden",
        }}
      >
        {robot.imageUrl ? (
          <Box
            component="img"
            src={robot.imageUrl}
            alt={robot.name}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "contain",
            }}
          />
        ) : (
          <Typography sx={{ fontWeight: 900 }}>{robot.name}</Typography>
        )}
      </Box>

      <Box
        sx={{
          px: 2,
          py: 0.5,
          borderRadius: 999,
          border: "1px solid #111",
          bgcolor: selected ? "#2d49ae" : "#fff",
          color: selected ? "#fff" : "#111",
        }}
      >
        <Typography sx={{ fontWeight: 900 }}>{robot.name}</Typography>
      </Box>
    </ButtonBase>
  );
}

function SelectRobot() {
  const navigate = useNavigate();

  const [robots, setRobots] = useState([]);
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConfig()
      .then((config) => {
        setRobots(config?.robots || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleNext = () => {
    if (!selectedRobot) return;

    navigate(
      `/pickup-select?robotId=${encodeURIComponent(
        selectedRobot.id,
      )}&robotName=${encodeURIComponent(
        selectedRobot.name,
      )}`,
    );
  };

  return (
    <ScreenLayout
      title="Select Robot"
      onBack={() => navigate("/")}
      onHome={() => navigate("/")}
      contentMaxWidth={900}
      headerMaxWidth={900}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 900,
          mx: "auto",
          p: 1,
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
          ROBOT SELECT
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 4,
                mb: 4,
                justifyItems: "center",
              }}
            >
              {robots.map((item) => (
                <RobotCard
                  key={item.id}
                  robot={item}
                  selected={selectedRobot?.id === item.id}
                  onSelect={setSelectedRobot}
                />
              ))}
            </Box>

            <Box
              sx={{
                width: "50%",
                mx: "auto",
              }}
            >
              <Button
                fullWidth
                variant="contained"
                disabled={!selectedRobot}
                onClick={handleNext}
                sx= {{
                    borderRadius: "4px",
                    p:1,
                    fontWeight:900,
                }}
              >
                Next
              </Button>
            </Box>
          </>
        )}
      </Box>
    </ScreenLayout>
  );
}

export default SelectRobot;
