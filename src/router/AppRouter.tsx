import React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";
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

function ProtectedLayout() {
  const { role, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-primary" size={28} />
          <p className="text-xs text-muted-foreground">A carregar...</p>
        </div>
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <MainLayout />;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { role } = useAuth();
  if (role === "staff") {
    return <Navigate to="/staff/schedule" replace />;
  }
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { role, isLoading } = useAuth();
  if (isLoading) {
    return null;
  }
  if (role) {
    return (
      <Navigate
        to={role === "staff" ? "/staff/schedule" : "/dashboard"}
        replace
      />
    );
  }
  return <>{children}</>;
}

export default function AppRouter() {
  const { role } = useAuth();

  return (
    <Routes>
      {/* Auth: se já estiver autenticado, redireciona para a aplicação */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />

      {/* Rotas protegidas (exigem autenticação real) */}
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
        {/* Rotas exclusivas de Administrador */}
        <Route
          path="/dashboard"
          element={
            <AdminRoute>
              <Dashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/schedules"
          element={
            <AdminRoute>
              <Dashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/assistants"
          element={
            <AdminRoute>
              <Assistants />
            </AdminRoute>
          }
        />
        <Route
          path="/absences"
          element={
            <AdminRoute>
              <Absences />
            </AdminRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <AdminRoute>
              <Reports />
            </AdminRoute>
          }
        />
        <Route
          path="/config"
          element={
            <AdminRoute>
              <Config />
            </AdminRoute>
          }
        />
        <Route
          path="/gantt"
          element={
            <AdminRoute>
              <Gantt />
            </AdminRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <AdminRoute>
              <Profile />
            </AdminRoute>
          }
        />
        <Route
          path="/platform-settings"
          element={
            <AdminRoute>
              <PlatformSettings />
            </AdminRoute>
          }
        />
        <Route path="/account" element={<Account />} />

        {/* Rotas de Assistente (Staff) */}
        <Route path="/staff/schedule" element={<StaffSchedule />} />
        <Route path="/staff/absences" element={<StaffAbsences />} />
        <Route path="/staff/absence" element={<StaffAbsences />} />
        <Route
          path="/staff/register-absence"
          element={<StaffRegisterAbsence />}
        />
        <Route path="/staff/account" element={<Account />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
