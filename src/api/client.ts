import axios, { AxiosError } from "axios";
import { toast } from "sonner";
import type { ApiValidationError } from "./types/api.types";

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 15000,
});

// Request Interceptor: Attach Bearer Token & Selected School
apiClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const schoolId = localStorage.getItem("selected_school_id");
    if (schoolId) {
      config.headers["X-School-ID"] = schoolId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Centralized Error Handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiValidationError>) => {
    if (!error.response) {
      toast.error("Erro de Ligação", {
        description:
          "Não foi possível contactar o servidor em " +
          API_BASE_URL +
          ". Verifique se o backend está ativo.",
      });
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const backendMessage = data?.message || (data as any)?.error;

    // Se o BackOffice enviou uma mensagem específica de negócio, mostramos exatamente essa mensagem!
    if (backendMessage && status !== 401 && status !== 422) {
      toast.error(backendMessage);
      return Promise.reject(error);
    }

    switch (status) {
      case 400:
        toast.error(backendMessage || "Os dados enviados são inválidos.");
        break;

      case 401:
        localStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_token");
        if (window.location.pathname !== "/login" && window.location.pathname !== "/auth/callback") {
          window.location.href = "/login";
        }
        break;

      case 403:
        toast.error(backendMessage || "Não tem permissões para realizar esta ação.");
        break;

      case 404:
        toast.error(backendMessage || "O recurso solicitado não existe.");
        break;

      case 422:
        // Validações de formulários geridas inline pelos próprios formulários
        break;

      case 429:
        toast.error(
          backendMessage ||
            "Demasiadas tentativas. Por favor aguarde um momento antes de tentar novamente."
        );
        break;

      case 500:
      default:
        toast.error(backendMessage || "Ocorreu um erro inesperado no servidor.");
        break;
    }

    return Promise.reject(error);
  }
);

export default apiClient;
