import React from "react";
import { useAuth } from "../context/AuthContext";
import AccountProfilePage from "../components/settings/AccountProfilePage";

export default function Account() {
  const { role } = useAuth();
  return <AccountProfilePage role={role || "admin"} />;
}

