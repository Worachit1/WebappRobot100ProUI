import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";

function MachineSelectDrop_Back() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const machineId = searchParams.get("machineId") || "";
  const machineName = searchParams.get("machineName") || "";
  const machineRcs = searchParams.get("machineRcs") || "";

  const goToMachineBufferDrop = () => {
    navigate(
      `/machine-buffer-drop?machineId=${encodeURIComponent(
        machineId,
      )}&machineName=${encodeURIComponent(
        machineName,
      )}&machineRcs=${encodeURIComponent(machineRcs)}`,
    );
  };

  const goToMachineRecall = () => {
    navigate(
      `/machine-recall?machineId=${encodeURIComponent(
        machineId,
      )}&machineName=${encodeURIComponent(
        machineName,
      )}&machineRcs=${encodeURIComponent(machineRcs)}`,
    );
  };


  return (
    <ScreenLayout
      title="หน้าเลือกamr หรือ นำของกลับ"
      onBack={() => navigate("/machine-select")}
      onHome={() => navigate("/")}
      contentMaxWidth={900}
      headerMaxWidth={900}
    >
      <Typography
        sx={{
          width: "100%",
          textAlign: "center",
          color: "#eb521d",
          fontSize: { xs: 20, md: 34 },
          fontWeight: 900,
          border: "2px solid #000",
          mb: { xs: 6, md: 5 },
          py: { xs: 0.5, md: 1.5 },
          boxSizing: "border-box",
        }}
      >
        SELECT CALL OR RECALL
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 5,
          width: "100%",
          justifyContent: "center",
        }}
      >
        <Button
          variant="contained"
          color="primary"
          sx={{
            flex: 1,
            borderRadius: "4px",
            py: { xs: 2, md: 4 },
            bgcolor: "#eb521d",
            border: "1px solid",
            fontSize: { xs: 22, md: 34 },
            fontWeight: 900,
            height: 120,
          }}
          onClick={goToMachineBufferDrop}
        >
          CALL RACK FROM BUFFERS.
        </Button>
      </Box>
      <Box
        sx={{
          display: "flex",
          gap: 5,
          width: "100%",
          justifyContent: "center",
        }}
      >
        <Button
          variant="contained"
          color="inherit"
          sx={{
            flex: 1,
            borderRadius: "4px",
            py: { xs: 2, md: 4 },
            bgcolor: "#f1ebeb",
            fontSize: { xs: 22, md: 34 },
            border: "1px solid",
            color: "#eb521d",
            fontWeight: 900,
            height: 120,
            marginTop: 5,
          }}
          onClick={goToMachineRecall}
        >
          RECALL RACK BUFFERS.
        </Button>
      </Box>
       
    </ScreenLayout>
  );
}

export default MachineSelectDrop_Back;
