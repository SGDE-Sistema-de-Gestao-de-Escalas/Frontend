import axios, { AxiosError } from "axios";
import type { ApiValidationError } from "./types/api.types";
import { notify } from "../components/common/FeedbackNotification";

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_URL || "http://localhost:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 15000,
});

// Request Interceptor: Attach Bearer Token (if available) & Selected School
apiClient.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const schoolId = localStorage.getItem("selected_school_id");
    const url = config.url || "";
    // Rotas globais que não dependem do contexto de uma escola específica
    const isGlobalRoute =
      url.includes("/schools") ||
      url.includes("/absence-types") ||
      url.includes("/holidays") ||
      url.includes("/roles") ||
      url.includes("/users") ||
      url.includes("/me");

    if (schoolId && !isGlobalRoute) {
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
    const isSilent = (error.config as any)?.silent || (error.config as any)?.skipGlobalErrorHandler;
    const method = error.config?.method?.toLowerCase();

    if (!error.response) {
      // Pedidos GET em background que falham por o backend estar offline não devem incomodar o utilizador com toasts
      // Notificamos apenas quando o utilizador tenta ativamente uma mutação (POST, PUT, PATCH, DELETE) ou login
      if (!isSilent && method && method !== "get") {
        notify.error(
          "Não foi possível contactar o servidor em " +
            API_BASE_URL +
            ". Verifique se o backend está ativo.",
          undefined,
          "Erro de Ligação"
        );
      }
      (error as any).__alreadyNotified = true;
      return Promise.reject(error);
    }

    const { status, data } = error.response;
    const backendMessage = data?.message || (data as any)?.error;

    // Se o backend responder que a escola selecionada é inválida/sem acesso, limpamos a cache
    if (status === 403 && typeof backendMessage === "string" && backendMessage.includes("Não tem acesso a esta escola")) {
      localStorage.removeItem("selected_school_id");
      (error as any).__alreadyNotified = true;
      return Promise.reject(error);
    }

    // Se o BackOffice enviou uma mensagem específica de negócio, exibimos com o FeedbackNotification
    if (backendMessage && status !== 401 && status !== 422) {
      notify.error(
        backendMessage,
        undefined,
        status === 409 ? "Conflito de Regras" : "Erro no Servidor"
      );
      (error as any).__alreadyNotified = true;
      return Promise.reject(error);
    }

    switch (status) {
      case 400:
        if (backendMessage) {
          notify.error(backendMessage, undefined, "Dados Inválidos");
          (error as any).__alreadyNotified = true;
        }
        break;

      case 401:
        localStorage.removeItem("auth_token");
        sessionStorage.removeItem("auth_token");
        if (!isSilent && window.location.pathname !== "/login" && window.location.pathname !== "/auth/callback") {
          window.location.href = "/login";
        }
        break;

      case 403:
        if (backendMessage) {
          notify.error(backendMessage, undefined, "Acesso Negado");
          (error as any).__alreadyNotified = true;
        }
        break;

      case 404:
        if (backendMessage) {
          notify.error(backendMessage, undefined, "Não Encontrado");
          (error as any).__alreadyNotified = true;
        }
        break;

      case 422:
        // Validações de formulários geridas inline pelos próprios formulários
        break;

      case 429:
        if (backendMessage) {
          notify.error(backendMessage, undefined, "Limite Excedido");
          (error as any).__alreadyNotified = true;
        }
        break;

      case 500:
      default:
        if (backendMessage) {
          notify.error(backendMessage, undefined, "Erro no Servidor");
          (error as any).__alreadyNotified = true;
        }
        break;
    }

    return Promise.reject(error);
  }
);

export default apiClient;
