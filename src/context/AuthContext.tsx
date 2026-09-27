import React, { createContext, useContext, useEffect, useState } from "react";
import type { Role } from "../types";
import authService, { AuthUser, LoginCredentials } from "../api/services/auth.service";

export interface UserProfile {
  id?: number;
  name: string;
  initials: string;
  role: Role;
  roleLabel: string;
  email: string;
  assistant_id?: number | null;
  school_id?: number | null;
}

interface AuthContextType {
  role: Role | null;
  user: UserProfile;
  login: (role: Role) => void;
  loginWithCredentials: (credentials: LoginCredentials, remember?: boolean) => Promise<Role>;
  logout: () => Promise<void>;
  switchRole: () => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const GUEST_USER: UserProfile = {
  name: "Utilizador",
  initials: "U",
  role: "admin",
  roleLabel: "Não autenticado",
  email: "",
};

const ADMIN_USER: UserProfile = {
  id: 1,
  name: "Administrador",
  initials: "AD",
  role: "admin",
  roleLabel: "Administrador",
  email: "admin@sgde.pt",
};

const STAFF_USER: UserProfile = {
  id: 2,
  name: "Assistente",
  initials: "AS",
  role: "staff",
  roleLabel: "Assistente",
  email: "assistente@sgde.pt",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractInitials(name: string): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function mapAuthUserToProfile(authUser: AuthUser): UserProfile {
  const roleSlug: Role =
    typeof authUser.role === "string"
      ? (authUser.role as Role)
      : (authUser.role as any)?.slug || "staff";

  return {
    id: authUser.id,
    name: authUser.name,
    initials: extractInitials(authUser.name),
    role: roleSlug,
    roleLabel: roleSlug === "admin" ? "Administrador" : "Assistente",
    email: authUser.email,
    assistant_id: authUser.assistant_id,
    school_id: authUser.school_id,
  };
}

export function AuthProvider({
  children,
  initialRole = null,
}: {
  children: React.ReactNode;
  initialRole?: Role | null;
}) {
  const [role, setRole] = useState<Role | null>(initialRole);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(
    initialRole === "admin"
      ? ADMIN_USER
      : initialRole === "staff"
      ? STAFF_USER
      : null
  );
  const [isLoading, setIsLoading] = useState(true);

  // Check existing session token on application load (localStorage or sessionStorage)
  useEffect(() => {
    async function checkCurrentSession() {
      const token =
        localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (token) {
        try {
          const authUser = await authService.getMe();
          const profile = mapAuthUserToProfile(authUser);
          setUserProfile(profile);
          setRole(profile.role);
        } catch {
          // Token is invalid or backend unreachable; clear token
          localStorage.removeItem("auth_token");
          sessionStorage.removeItem("auth_token");
          setRole(null);
          setUserProfile(null);
        }
      } else {
        setRole(null);
        setUserProfile(null);
      }
      setIsLoading(false);
    }

    checkCurrentSession();
  }, []);

  async function loginWithCredentials(
    credentials: LoginCredentials,
    remember: boolean = true
  ): Promise<Role> {
    const response = await authService.login(credentials);
    if (remember) {
      localStorage.setItem("auth_token", response.token);
      sessionStorage.removeItem("auth_token");
    } else {
      sessionStorage.setItem("auth_token", response.token);
      localStorage.removeItem("auth_token");
    }

    const profile = mapAuthUserToProfile(response.user);
    setUserProfile(profile);
    setRole(profile.role);
    return profile.role;
  }

  function login(newRole: Role) {
    setRole(newRole);
    setUserProfile(newRole === "admin" ? ADMIN_USER : STAFF_USER);
  }

  async function logout() {
    try {
      const token =
        localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (token) {
        await authService.logout();
      }
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
      setRole(null);
      setUserProfile(null);
    }
  }

  function switchRole() {
    setRole((prev) => {
      const next = prev === "admin" ? "staff" : "admin";
      setUserProfile(next === "admin" ? ADMIN_USER : STAFF_USER);
      return next;
    });
  }

  return (
    <AuthContext.Provider
      value={{
        role,
        user: userProfile || GUEST_USER,
        login,
        loginWithCredentials,
        logout,
        switchRole,
        isAuthenticated: role !== null,
        isLoading,
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
