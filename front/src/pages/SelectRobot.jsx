import { useEffect, useRef, useState } from "react";
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

function RobotCard({ robot, selected, onSelect, onOpen }) {
  const lastTapRef = useRef(0);

  const handleClick = () => {
    const now = Date.now();

    if (now - lastTapRef.current < 300) {
      onOpen(robot); // Double Click / Double Tap
    } else {
      onSelect(robot); // Single Click
    }

    lastTapRef.current = now;
  };

  return (
    <ButtonBase
      onClick={handleClick}
      disableRipple
      disableTouchRipple
      focusRipple={false}
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: { xs: 0.5, md: 1 },
        borderRadius: 2,
        "&.Mui-focusVisible": {
          outline: "none",
        },
      }}
    >
      <Box
        sx={{
          width: { xs: 100, md: 160 },
          height: { xs: 100, md: 160 },
          borderRadius: "50%",
          border: "3px solid",
          borderColor: selected ? "primary.main" : "transparent",
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
          px: { xs: 1.5, md: 2 },
          py: { xs: 0.3, md: 0.5 },
          borderRadius: 999,
          border: "1px solid #111",
          bgcolor: selected ? "primary.main" : "#fff",
          color: selected ? "#fff" : "#111",
        }}
      >
        <Typography sx={{ fontWeight: 900, fontSize: { xs: 14, md: 16 } }}>
          {robot.name}
        </Typography>
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
      )}&robotName=${encodeURIComponent(selectedRobot.name)}`,
    );
  };

  const handleOpenRobot = (robot) => {
    navigate(
      `/pickup-select?robotId=${encodeURIComponent(
        robot.id,
      )}&robotName=${encodeURIComponent(robot.name)}`,
    );
  };

  return (
    <ScreenLayout
      title="Select Robot"
      onBack={() => navigate("/")}
      onHome={() => navigate("/")}
      contentMaxWidth={1180}
      headerMaxWidth={1180}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 1180,
          mx: "auto",
          p: 1,
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
          ROBOT SELECT
        </Typography>

        {loading ? (
          <CircularProgress />
        ) : (
          <>
            <Box
              sx={{
                display: "flex",
                gap: { xs: 2, md: 5 },
                mb: { xs: 2, md: 4 },
                overflowX: "auto",
                overflowY: "hidden",
                px: 1,
                py: { xs: 1, md: 2 },
                WebkitOverflowScrolling: "touch",
              }}
            >
              {robots.map((item) => (
                <Box
                  key={item.id}
                  sx={{
                    flex: {
                      xs: "0 0 140px",
                      md: "0 0 210px",
                    },
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <RobotCard
                    robot={item}
                    selected={selectedRobot?.id === item.id}
                    onSelect={setSelectedRobot}
                    onOpen={handleOpenRobot}
                  />
                </Box>
              ))}
            </Box>

            <Box
              sx={{
                position: "relative",
                width: { xs: "90%", md: 320 },
                maxWidth: 320,
                mx: "auto",
              }}
            >
              <Typography
                sx={{
                  position: { xs: "static", md: "absolute" },
                  left: { md: -350 },
                  top: { md: "50%" },
                  transform: { md: "translateY(-50%)" },
                  textAlign: { xs: "center", md: "left" },
                  mb: { xs: 1, md: 0 },
                  color: "red",
                  fontWeight: 800,
                  fontSize: { xs: 11, md: 12 },
                  whiteSpace: "nowrap",
                }}
              >
                ** Can double click robot to select. **
              </Typography>

              <Button
                fullWidth
                variant="contained"
                disabled={!selectedRobot}
                onClick={handleNext}
                sx={{
                  borderRadius: "4px",
                  p: 2,
                  fontWeight: 900,
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
