import apiClient from "../client";
import { Role } from "../../types";

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthUser {
  id: string | number;
  name: string;
  email: string;
  role: Role | { id: string | number; name: string; slug: Role };
  assistant_id?: string | number | null;
  school_id?: string | number | null;
}

export interface BackendLoginResponse {
  access_token?: string;
  token?: string;
  user: AuthUser;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Tenta primeiro /login (padrão Laravel da tua branch), com fallback para /auth/login
    let response;
    try {
      response = await apiClient.post<BackendLoginResponse>("/login", credentials);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        response = await apiClient.post<BackendLoginResponse>("/auth/login", credentials);
      } else {
        throw err;
      }
    }

    const token = response.data.access_token || response.data.token || "";
    return {
      token,
      user: response.data.user,
    };
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post("/logout");
    } catch (err: any) {
      if (err?.response?.status === 404) {
        await apiClient.post("/auth/logout");
      } else {
        throw err;
      }
    }
  },

  async getMe(): Promise<AuthUser> {
    try {
      const response = await apiClient.get<any>("/me");
      return response.data?.data || response.data?.user || response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const response = await apiClient.get<any>("/auth/me");
        return response.data?.data || response.data?.user || response.data;
      }
      throw err;
    }
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      "/forgot-password",
      { email }
    );
    return response.data;
  },

  async resetPassword(data: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      "/reset-password",
      data
    );
    return response.data;
  },

  async changePassword(data: {
    current_password: string;
    new_password: string;
    new_password_confirmation: string;
  }): Promise<{ message: string }> {
    const response = await apiClient.put<{ message: string }>(
      "/update-password",
      data
    );
    return response.data;
  },
};

export default authService;
