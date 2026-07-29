import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";

import { OrderProvider } from "./context/OrderContext.jsx";
import Login from "./pages/Login.jsx";
import Home from "./pages/Home.jsx";
import History from "./pages/History.jsx";


import SelectRobot from "./pages/SelectRobot.jsx";
import PickupSelect from "./pages/PickupSelect.jsx";
import DropSelect from "./pages/DropSelect.jsx";
import Status from "./pages/Status.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import PointStatePage from "./pages/PointStatePage.jsx";

function isAuthed() {
  return Boolean(localStorage.getItem("authUser"));
}

function RequireAuth({ children }) {
  return children;
}

function App() {
  return (
    <OrderProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Home />
            </RequireAuth>
          }
        />

        <Route
          path="/history"
          element={
            <RequireAuth>
              <History />
            </RequireAuth>
          }
        />


        <Route
          path="/select-robot"
          element={
            <RequireAuth>
              <SelectRobot />
            </RequireAuth>
          }
        />

        <Route
          path="/pickup-select"
          element={
            <RequireAuth>
              <PickupSelect />
            </RequireAuth>
          }
        />

        <Route
          path="/drop-select"
          element={
            <RequireAuth>
              <DropSelect />
            </RequireAuth>
          }
        />

        <Route
          path="/status"
          element={
            <RequireAuth>
              <Status />
            </RequireAuth>
          }
        />

        <Route
          path="/admin"
          element={
            <RequireAuth>
              <AdminPage />
            </RequireAuth>
          }
        />

        <Route
          path="/admin/point-state"
          element={
            <RequireAuth>
              <PointStatePage />
            </RequireAuth>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </OrderProvider>
  );
}

export default App;
