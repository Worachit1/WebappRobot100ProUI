import React, { useState } from "react";
import {
  Box,
  Button,
  colors,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

import ScreenLayout from "../components/ScreenLayout.jsx";
import Logo from "../components/Logo.jsx";

function Home() {
  const navigate = useNavigate();
  const [pendingPath, setPendingPath] = useState(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const openPasswordDialog = (path) => {
    setPendingPath(path);
    setPassword("");
    setError("");
  };

  const closeDialog = () => {
    setPendingPath(null);
    setPassword("");
    setError("");
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") submitPassword();
  };

  return (
    <ScreenLayout
      title="หน้าหลัก"
      onBack={() => {}}
      showBack={false}
      onHome={() => navigate("/")}
      showLogo={false}
      contentMaxWidth={900}
      showBackground={false}
    >
      <Logo />
      <Button
        variant="contained"
        sx={{
          flex: 1,
          borderRadius: "4px",
          width: "100%",
          py: 1.4,
          fontSize: 20,
          bgcolor: "#2d49ae",
          fontWeight: 900,
          height: 120,
          marginTop: 2,
        }}
        onClick={() => navigate("/select-robot")}
      >
        SELECT ROBOT
      </Button>
      <Box
        sx={{
          display: "flex",
          gap: 2,
          width: "100%",
          justifyContent: "center",
          fontWeight: 900,
        }}
      >
        <Button
          variant="contained"
          color="primary"
          sx={{
            borderRadius: "4px",
            width: "100%",
            py: 1.4,
            fontWeight: 900,
            fontSize: 20,
          }}
          onClick={() => navigate("/history")}
        >
          HISTORY
        </Button>
        <Button
          variant="outlined"
          color="primary"
          sx={{
            borderRadius: "4px",
            width: "100%",
            py: 1.4,
            fontWeight: 900,
            fontSize: 20,
          }}
          onClick={() => navigate("/status")}
        >
          STATUS / {" "}
          <Box
            component="span"
            sx={{
              color: "#f44336",
              fontWeight: 900,
              ml: 1
            }}
          >
            {" "} CANCEL TASK
          </Box>
        </Button>
      </Box>
      <Button
        variant="outlined"
        color="primary"
        sx={{
          borderRadius: "4px",
          width: "100%",
          py: 1.4,
          fontWeight: 900,
          fontSize: 20,
        }}
        onClick={() => navigate("/admin")}
      >
        SETTINGS
      </Button>
      <Button
        variant="outlined"
        color="primary"
        sx={{
          borderRadius: "4px",
          width: "100%",
          py: 1.4,
          fontWeight: 900,
          fontSize: 20,
        }}
        onClick={() => navigate("/map-dashboard")}
      >
        MAP DASHBOARD
      </Button>
    </ScreenLayout>
  );
}

export default Home;
