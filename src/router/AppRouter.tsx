import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";
import Absences from "../pages/Absences";
import Assistants from "../pages/Assistants";
import Dashboard from "../pages/Dashboard";
import LegacyApp from "../pages/LegacyApp";
import Schedules from "../pages/Schedules";

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LegacyApp />} />
      <Route element={<MainLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="schedules" element={<Schedules />} />
        <Route path="assistants" element={<Assistants />} />
        <Route path="absences" element={<Absences />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
