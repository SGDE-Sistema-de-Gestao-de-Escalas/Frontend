import React from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import type { AdminPage, StaffPage } from "../../types";
import AdminLayout from "./AdminLayout";
import StaffLayout from "./StaffLayout";

export default function MainLayout() {
  const { role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Determine current page from pathname
  const path = location.pathname;
  let adminPage: AdminPage = "dashboard";
  let staffPage: StaffPage = "schedule";

  if (path.startsWith("/staff")) {
    if (path.includes("register-absence")) staffPage = "register-absence";
    else if (path.includes("absence")) staffPage = "absence-detail";
    else if (path.includes("account")) staffPage = "account";
    else staffPage = "schedule";
  } else {
    if (path.includes("assistants")) adminPage = "assistants";
    else if (path.includes("absences")) adminPage = "absences";
    else if (path.includes("reports")) adminPage = "reports";
    else if (path.includes("gantt")) adminPage = "gantt";
    else if (path.includes("config")) adminPage = "config";
    else if (path.includes("profile")) adminPage = "profile";
    else if (path.includes("platform-settings")) adminPage = "platform-settings";
    else if (path.includes("account")) adminPage = "account";
    else adminPage = "dashboard";
  }

  function handleAdminNavigate(page: AdminPage) {
    if (page === "dashboard") navigate("/dashboard");
    else navigate(`/${page}`);
  }

  function handleStaffNavigate(page: StaffPage) {
    if (page === "schedule") navigate("/staff/schedule");
    else if (page === "absence-detail") navigate("/staff/absences");
    else if (page === "register-absence") navigate("/staff/register-absence");
    else if (page === "account") navigate("/staff/account");
    else navigate(`/staff/${page}`);
  }

  if (role === "staff") {
    return (
      <StaffLayout currentPage={staffPage} onNavigate={handleStaffNavigate}>
        <Outlet />
      </StaffLayout>
    );
  }

  return (
    <AdminLayout currentPage={adminPage} onNavigate={handleAdminNavigate}>
      <Outlet />
    </AdminLayout>
  );
}
