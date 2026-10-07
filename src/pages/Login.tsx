import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../components/auth/LoginPage";
import type { Role } from "../types";

export default function Login() {
  const { login, role, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && role) {
      if (role === "admin") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/staff/schedule", { replace: true });
      }
    }
  }, [isLoading, role, navigate]);

  if (isLoading) {
    return null;
  }

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

