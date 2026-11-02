import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../components/auth/LoginPage";
import type { Role } from "../types";

export default function ResetPassword() {
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleLogin(role: Role) {
    login(role);
    navigate(role === "admin" ? "/dashboard" : "/staff/schedule");
  }

  return <LoginPage onLogin={handleLogin} />;
}
