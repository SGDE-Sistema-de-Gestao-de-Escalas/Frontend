import React, { createContext, useContext, useEffect, useState } from "react";
import type { Role } from "../types";
import authService, { AuthUser, LoginCredentials } from "../api/services/auth.service";

export interface UserProfile {
  id?: number | string;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  initials: string;
  role: Role;
  roleLabel: string;
  email: string;
  assistant_id?: number | string | null;
  school_id?: number | string | null;
}

interface AuthContextType {
  role: Role | null;
  user: UserProfile;
  login: (role: Role) => void;
  loginWithCredentials: (credentials: LoginCredentials, remember?: boolean) => Promise<Role>;
  loginWithToken: (token: string) => Promise<Role>;
  logout: () => Promise<void>;
  switchRole: () => void;
  refreshProfile: () => Promise<void>;
  updateUserLocal: (updated: Partial<UserProfile>) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const EMPTY_USER: UserProfile = {
  id: "",
  name: "",
  first_name: "",
  last_name: "",
  initials: "",
  role: "admin",
  roleLabel: "",
  email: "",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function extractInitials(name?: string | null): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function mapAuthUserToProfile(authUser: AuthUser): UserProfile {
  const roleSlug: Role =
    typeof authUser.role === "string"
      ? (authUser.role as Role)
      : (authUser.role as any)?.slug || "staff";

  const resolvedName =
    authUser.name ||
    [authUser.first_name, authUser.last_name].filter(Boolean).join(" ").trim() ||
    authUser.email?.split("@")[0] ||
    "Utilizador";

  return {
    id: authUser.id,
    name: resolvedName,
    first_name: authUser.first_name || null,
    last_name: authUser.last_name || null,
    initials: extractInitials(resolvedName),
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
  const [userProfile, setUserProfile] = useState<UserProfile>(EMPTY_USER);
  const [isLoading, setIsLoading] = useState(true);

  // Check existing session on application load (supports HttpOnly cookies or fallback localStorage token)
  useEffect(() => {
    async function checkCurrentSession() {
      try {
        // With HttpOnly cookies enabled (withCredentials: true), getMe() validates the active cookie session.
        // We use silent: true so unauthenticated visitors or an idle server do not trigger intrusive toast banners on F5.
        const authUser = await authService.getMe({ silent: true });
        const profile = mapAuthUserToProfile(authUser);
        setUserProfile(profile);
        setRole(profile.role);
      } catch {
        // Session expired, unauthenticated or backend idle; clean up storage without showing alert
        localStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_token");
        setRole(null);
      } finally {
        setIsLoading(false);
      }
    }

    checkCurrentSession();
  }, []);

  async function loginWithCredentials(
    credentials: LoginCredentials,
    remember: boolean = true
  ): Promise<Role> {
    const isRemember = credentials.remember !== undefined ? credentials.remember : remember;
    const response = await authService.login({ ...credentials, remember: isRemember });

    // O backend agora emite cookie HttpOnly ('access_token').
    // Limpamos quaisquer tokens antigos do localStorage/sessionStorage para segurança contra XSS.
    localStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_token");

    const profile = mapAuthUserToProfile(response.user);
    setUserProfile(profile);
    setRole(profile.role);
    return profile.role;
  }

  async function loginWithToken(token: string): Promise<Role> {
    // Usado apenas para OAuth callback inicial se vier por query param
    if (token) {
      localStorage.setItem("auth_token", token);
    }
    const authUser = await authService.getMe();
    const profile = mapAuthUserToProfile(authUser);
    // Após obter o perfil, se o backend já configurou a sessão, limpa do storage
    localStorage.removeItem("auth_token");
    sessionStorage.removeItem("auth_token");
    setUserProfile(profile);
    setRole(profile.role);
    return profile.role;
  }

  function login(newRole: Role) {
    setRole(newRole);
    setUserProfile((prev) => ({
      ...prev,
      role: newRole,
      roleLabel: newRole === "admin" ? "Administrador" : "Assistente",
    }));
  }

  async function logout() {
    try {
      // Sempre chamamos /logout para que o backend possa limpar o cookie HttpOnly ou revogar a sessão/token
      await authService.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem("auth_token");
      sessionStorage.removeItem("auth_token");
      localStorage.removeItem("selected_school_id");
      setUserProfile(EMPTY_USER);
      setRole(null);
    }
  }

  function switchRole() {
    setRole((prev) => {
      const next = prev === "admin" ? "staff" : "admin";
      setUserProfile((prevProfile) => ({
        ...prevProfile,
        role: next,
        roleLabel: next === "admin" ? "Administrador" : "Assistente",
      }));
      return next;
    });
  }

  async function refreshProfile() {
    try {
      const authUser = await authService.getMe({ silent: true });
      const profile = mapAuthUserToProfile(authUser);
      setUserProfile(profile);
      setRole(profile.role);
    } catch (err) {
      console.warn("Could not refresh user profile:", err);
    }
  }

  function updateUserLocal(updated: Partial<UserProfile>) {
    setUserProfile((prev) => {
      const merged = { ...prev, ...updated };
      if (updated.first_name !== undefined || updated.last_name !== undefined) {
        const fn = updated.first_name ?? prev.first_name ?? "";
        const ln = updated.last_name ?? prev.last_name ?? "";
        const fullName = [fn, ln].filter(Boolean).join(" ").trim() || merged.name;
        merged.name = fullName;
        merged.initials = extractInitials(fullName);
      }
      return merged;
    });
  }

  return (
    <AuthContext.Provider
      value={{
        role,
        user: userProfile,
        login,
        loginWithCredentials,
        loginWithToken,
        logout,
        switchRole,
        refreshProfile,
        updateUserLocal,
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
