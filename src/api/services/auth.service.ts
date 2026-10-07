import apiClient from "../client";
import { Role } from "../../types";

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface AuthUser {
  id: string | number;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
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

export type OAuthProvider = "google" | "azure";

export interface OAuthRedirectResponse {
  url: string;
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

  async getMe(options?: { silent?: boolean }): Promise<AuthUser> {
    const config = { silent: options?.silent ?? false };
    try {
      const response = await apiClient.get<any>("/me", config as any);
      return response.data?.data || response.data?.user || response.data;
    } catch (err: any) {
      if (err?.response?.status === 404) {
        const response = await apiClient.get<any>("/auth/me", config as any);
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
    const response = await apiClient.post<{ message: string }>(
      "/update-password",
      data
    );
    return response.data;
  },

  async updateProfile(data: {
    first_name: string;
    last_name: string;
    email: string;
  }, userId?: string | number): Promise<AuthUser> {
    // 1) Tenta o endpoint específico de perfil PUT /me
    try {
      const res = await apiClient.put<any>("/me", data);
      return res.data?.data || res.data?.user || res.data;
    } catch (err: any) {
      // 2) Se /me der 404/405 e tivermos o userId, tenta PUT /users/{id}
      if ((err?.response?.status === 404 || err?.response?.status === 405) && userId) {
        const res = await apiClient.put<any>(`/users/${userId}`, data);
        return res.data?.data || res.data?.user || res.data;
      }
      throw err;
    }
  },

  /**
   * Delete own account
   * DELETE /api/me
   */
  async deleteMe(): Promise<{ message: string; delete_action?: "hard_delete" | "anonymize" }> {
    const response = await apiClient.delete<{ message: string; delete_action?: "hard_delete" | "anonymize" }>(
      "/me"
    );
    return response.data;
  },

  /**
   * Request deactivation / privacy deletion (RGPD)
   * POST /api/privacy/request-deactivation
   */
  async requestDeactivation(reason?: string): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(
      "/privacy/request-deactivation",
      reason ? { reason } : {}
    );
    return response.data;
  },

  /**
   * Get OAuth redirect authorization URL
   * GET /api/auth/{provider}/redirect
   */
  async getOAuthRedirectUrl(provider: OAuthProvider): Promise<string> {
    const response = await apiClient.get<OAuthRedirectResponse>(
      `/auth/${provider}/redirect`
    );
    return response.data.url;
  },
};

export default authService;
