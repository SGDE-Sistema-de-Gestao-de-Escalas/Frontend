import React, { createContext, useContext, useState } from "react";
import type { Role } from "../types";

interface UserProfile {
  name: string;
  initials: string;
  role: Role;
  roleLabel: string;
  email: string;
}

interface AuthContextType {
  role: Role | null;
  user: UserProfile;
  login: (role: Role) => void;
  logout: () => void;
  switchRole: () => void;
  isAuthenticated: boolean;
}

const ADMIN_USER: UserProfile = {
  name: "Miguel Silva",
  initials: "MS",
  role: "admin",
  roleLabel: "Administrador",
  email: "admin@sgde.pt",
};

const STAFF_USER: UserProfile = {
  name: "Ana Costa",
  initials: "AC",
  role: "staff",
  roleLabel: "Assistente",
  email: "assistente@sgde.pt",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({
  children,
  initialRole = "admin",
}: {
  children: React.ReactNode;
  initialRole?: Role | null;
}) {
  const [role, setRole] = useState<Role | null>(initialRole);

  const user = role === "admin" ? ADMIN_USER : STAFF_USER;

  function login(newRole: Role) {
    setRole(newRole);
  }

  function logout() {
    setRole(null);
  }

  function switchRole() {
    setRole((prev) => (prev === "admin" ? "staff" : "admin"));
  }

  return (
    <AuthContext.Provider
      value={{
        role,
        user,
        login,
        logout,
        switchRole,
        isAuthenticated: role !== null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

