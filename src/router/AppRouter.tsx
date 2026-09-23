import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../components/layout/MainLayout";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Assistants from "../pages/Assistants";
import Absences from "../pages/Absences";
import Reports from "../pages/Reports";
import Config from "../pages/Config";
import Gantt from "../pages/Gantt";
import Profile from "../pages/Profile";
import PlatformSettings from "../pages/PlatformSettings";
import Account from "../pages/Account";
import StaffSchedule from "../pages/StaffSchedule";
import StaffAbsences from "../pages/StaffAbsences";
import StaffRegisterAbsence from "../pages/StaffRegisterAbsence";
import LegacyApp from "../pages/LegacyApp";

function ProtectedLayout() {
  const { role } = useAuth();
  if (!role) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout />;
}

export default function AppRouter() {
  const { role } = useAuth();

  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Main app layout routes */}
      <Route element={<ProtectedLayout />}>
        <Route
          path="/"
          element={
            <Navigate
              to={role === "staff" ? "/staff/schedule" : "/dashboard"}
              replace
            />
          }
        />
        {/* Admin Routes */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/schedules" element={<Dashboard />} />
        <Route path="/assistants" element={<Assistants />} />
        <Route path="/absences" element={<Absences />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/config" element={<Config />} />
        <Route path="/gantt" element={<Gantt />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/platform-settings" element={<PlatformSettings />} />
        <Route path="/account" element={<Account />} />

        {/* Staff Routes */}
        <Route path="/staff/schedule" element={<StaffSchedule />} />
        <Route path="/staff/absences" element={<StaffAbsences />} />
        <Route path="/staff/absence" element={<StaffAbsences />} />
        <Route
          path="/staff/register-absence"
          element={<StaffRegisterAbsence />}
        />
        <Route path="/staff/account" element={<Account />} />
      </Route>

      {/* Legacy route preserved for 1:1 diff and comparison */}
      <Route path="/legacy" element={<LegacyApp role="admin" />} />
      <Route path="/legacy/staff" element={<LegacyApp role="staff" />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
