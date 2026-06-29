import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";
import { fetchMachine } from "../api/client.js";

function MachineSelect() {
  const navigate = useNavigate();

  const [machines, setMachines] = useState([]);
  const [machineId, setMachineId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMachine()
      .then((res) => {
        setMachines(res?.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedMachine = machines.find((item) => item.id === machineId);

  const handleNext = () => {
    if (!selectedMachine) return;

    navigate(
      `/machine-select-drop-or-takeback?machineId=${encodeURIComponent(
        selectedMachine.id,
      )}&machineName=${encodeURIComponent(selectedMachine.name
      )}&machineRcs=${encodeURIComponent(selectedMachine.rcsPosition)}`,
    );
  };

  return (
    <ScreenLayout
      title="Machine Drop"
      onBack={() => navigate("/")}
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
          MACHINE SELECT
        </Typography>

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
              Machines
            </Typography>
            <Select
              fullWidth
              value={machineId}
              displayEmpty
              onChange={(e) => setMachineId(e.target.value)}
              sx={{
                mb: { xs: 3, md: 5 },
                height: { xs: 56, md: 82 },
                fontSize: { xs: 18, md: 30 },
                borderRadius: "4px",
              }}
            >
              <MenuItem value="" disabled sx={{ fontSize: { xs: 18, md: 28 } }}>
                <em>---Select Machine---</em>
              </MenuItem>

              {machines.map((item, index) => (
                <MenuItem
                  key={item.id || `machine-${index}`}
                  value={item.id}
                  sx={{ fontSize: { xs: 18, md: 28 } }}
                >
                  {item.name}
                </MenuItem>
              ))}
            </Select>

            {selectedMachine && (
              <Box
                sx={{
                  border: "2px solid #ddd",
                  p: { xs: 2, md: 3 },
                  mb: { xs: 3, md: 5 },
                }}
              >
                <Typography sx={{ fontSize: { xs: 18, md: 28 } }}>
                  <b>Machine:</b> {selectedMachine.name}
                </Typography>
              </Box>
            )}
            <Button
              fullWidth
              variant="contained"
              disabled={!selectedMachine}
              onClick={handleNext}
              sx={{
                height: { xs: 56, md: 90 },
                fontSize: { xs: 20, md: 36 },
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

export default MachineSelect;
