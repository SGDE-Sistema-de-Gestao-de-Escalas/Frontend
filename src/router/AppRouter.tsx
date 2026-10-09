import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import MainLayout from "../components/layout/MainLayout";
import Login from "../pages/Login";
import OAuthCallback from "../pages/OAuthCallback";
import Dashboard from "../pages/Dashboard";
import Assistants from "../pages/Assistants";
import Absences from "../pages/Absences";
import Reports from "../pages/Reports";
import Config from "../pages/Config";
import Profile from "../pages/Profile";
import PlatformSettings from "../pages/PlatformSettings";
import Account from "../pages/Account";
import StaffSchedule from "../pages/StaffSchedule";
import StaffAbsences from "../pages/StaffAbsences";
import StaffRegisterAbsence from "../pages/StaffRegisterAbsence";
import LegacyApp from "../pages/LegacyApp";

import TitleUpdater from "./TitleUpdater";
import { Loader2 } from "lucide-react";

function ProtectedLayout() {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">A verificar sessão...</p>
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/login" replace />;
  }
  return <MainLayout />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  if (role !== "admin") {
    return <Navigate to="/staff/schedule" replace />;
  }
  return <>{children}</>;
}

function StaffRoute({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  if (role !== "staff") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}

export default function AppRouter() {
  const { role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-background gap-3">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">A carregar...</p>
      </div>
    );
  }

  return (
    <>
      <TitleUpdater />
      <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<OAuthCallback />} />

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
        <Route path="/dashboard" element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="/schedules" element={<AdminRoute><Dashboard /></AdminRoute>} />
        <Route path="/assistants" element={<AdminRoute><Assistants /></AdminRoute>} />
        <Route path="/absences" element={<AdminRoute><Absences /></AdminRoute>} />
        <Route path="/reports" element={<AdminRoute><Reports /></AdminRoute>} />
        <Route path="/config" element={<AdminRoute><Config /></AdminRoute>} />

        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/platform-settings" element={<AdminRoute><PlatformSettings /></AdminRoute>} />
        <Route path="/account" element={<Account />} />


        {/* Staff Routes */}
        <Route path="/staff/schedule" element={<StaffRoute><StaffSchedule /></StaffRoute>} />
        <Route path="/staff/absences" element={<StaffRoute><StaffAbsences /></StaffRoute>} />
        <Route path="/staff/absence" element={<StaffRoute><StaffAbsences /></StaffRoute>} />
        <Route
          path="/staff/register-absence"
          element={<StaffRoute><StaffRegisterAbsence /></StaffRoute>}
        />
        <Route path="/staff/account" element={<StaffRoute><Account /></StaffRoute>} />
      </Route>

      {/* Legacy route preserved for 1:1 diff and comparison */}
      <Route path="/legacy" element={<LegacyApp role="admin" />} />
      <Route path="/legacy/staff" element={<LegacyApp role="staff" />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
