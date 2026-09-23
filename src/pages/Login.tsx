import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../components/auth/LoginPage";
import type { Role } from "../types";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleLogin(role: Role) {
    login(role);
    if (role === "admin") {
      navigate("/dashboard");
    } else {
      navigate("/staff/schedule");
    }
  }

  return <LoginPage onLogin={handleLogin} />;
}

