import * as React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../ui/utils";

export type FeedbackType = "success" | "error" | "warning" | "info";

export interface FeedbackNotificationProps {
  type: FeedbackType;
  title?: string;
  message: React.ReactNode;
  description?: React.ReactNode;
  onClose?: () => void;
  className?: string;
  isToast?: boolean;
}

const FEEDBACK_CONFIG = {
  success: {
    icon: CheckCircle2,
    badgeBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30 dark:border-emerald-500/20",
    titleColor: "text-emerald-700 dark:text-emerald-400",
    defaultTitle: "Operação Concluída",
  },
  error: {
    icon: AlertCircle,
    badgeBg: "bg-destructive/15 text-destructive",
    border: "border-destructive/30 dark:border-destructive/20",
    titleColor: "text-destructive",
    defaultTitle: "Falha na Operação",
  },
  warning: {
    icon: AlertTriangle,
    badgeBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30 dark:border-amber-500/20",
    titleColor: "text-amber-700 dark:text-amber-400",
    defaultTitle: "Aviso",
  },
  info: {
    icon: Info,
    badgeBg: "bg-primary/15 text-primary",
    border: "border-primary/30 dark:border-primary/20",
    titleColor: "text-primary",
    defaultTitle: "Informação",
  },
} as const;

/**
 * Componente de UI responsável por exibir mensagens de feedback (sucesso ou falha/erro),
 * especialmente mensagens vindas diretamente do BackOffice / API.
 *
 * Pode ser utilizado como:
 * 1. Componente React visual (Inline Banner / Alert dentro de páginas ou modais)
 * 2. Toast interativo via helper `showFeedbackToast` ou objeto `notify`
 */
export function FeedbackNotification({
  type,
  title,
  message,
  description,
  onClose,
  className,
  isToast = false,
}: FeedbackNotificationProps) {
  const config = FEEDBACK_CONFIG[type];
  const Icon = config.icon;
  const displayTitle = title ?? config.defaultTitle;

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border bg-card text-card-foreground shadow-md transition-all duration-200",
        config.border,
        isToast ? "w-full sm:max-w-md p-3.5 shadow-xl" : "w-full p-4 my-3",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
            config.badgeBg
          )}
        >
          <Icon size={16} />
        </div>

        <div className="flex-1 min-w-0">
          {displayTitle && (
            <p className={cn("text-xs font-semibold leading-none mb-1", config.titleColor)}>
              {displayTitle}
            </p>
          )}

          <div className="text-xs text-foreground/90 leading-relaxed font-normal break-words">
            {message}
          </div>

          {description && (
            <div className="text-[11px] text-muted-foreground mt-1 leading-normal">
              {description}
            </div>
          )}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0 -mr-1 -mt-1"
            aria-label="Fechar notificação"
          >
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * Extrai a mensagem de erro formatada enviada pelo BackOffice (Laravel API).
 * Devolve null se a API não enviou nenhuma mensagem explicita.
 */
export function getBackendErrorMessage(
  error: any,
  fallback?: string
): string | null {
  if (!error) return fallback ?? null;
  if (typeof error === "string") return error;

  // Resposta estruturada do Laravel:
  if (error.response?.data?.message && typeof error.response.data.message === "string") {
    return error.response.data.message;
  }

  // Resposta com campo 'error':
  if (error.response?.data?.error && typeof error.response.data.error === "string") {
    return error.response.data.error;
  }

  // Validações com múltiplos erros (422):
  if (error.response?.data?.errors && typeof error.response.data.errors === "object") {
    const errorEntries = Object.values(error.response.data.errors) as string[][];
    const firstErrors = errorEntries.map((msgs) => (Array.isArray(msgs) ? msgs[0] : String(msgs)));
    if (firstErrors.length > 0) {
      return firstErrors.join(" ");
    }
  }

  return fallback ?? null;
}

/**
 * Extrai a mensagem de sucesso enviada pelo BackOffice.
 * Devolve null se o endpoint não enviou campo 'message'.
 */
export function getBackendSuccessMessage(
  response: any,
  fallback?: string
): string | null {
  if (!response) return fallback ?? null;
  if (typeof response === "string") return response;

  if (response.data?.message && typeof response.data.message === "string") {
    return response.data.message;
  }

  if (response.message && typeof response.message === "string") {
    return response.message;
  }

  return fallback ?? null;
}

/**
 * Apresenta um toast personalizado de feedback integrado com o Sonner
 * utilizando exatamente a componente FeedbackNotification.
 */
export function showFeedbackToast(
  type: FeedbackType,
  message: React.ReactNode,
  title?: string,
  options?: { duration?: number; description?: React.ReactNode }
) {
  const duration = options?.duration ?? (type === "error" ? 6000 : 4000);

  return toast.custom(
    (toastId) => (
      <FeedbackNotification
        type={type}
        title={title}
        message={message}
        description={options?.description}
        onClose={() => toast.dismiss(toastId)}
        isToast
      />
    ),
    { duration }
  );
}

/**
 * Helper unificado para notificar o utilizador com o design system da aplicação:
 *
 * Exemplo de uso:
 * notify.success("Escola criada com sucesso");
 * notify.error(err, "Falha ao eliminar escola");
 */
export const notify = {
  success: (
    responseOrMessage: any,
    title?: string,
    options?: { duration?: number; description?: React.ReactNode }
  ) => {
    const message =
      typeof responseOrMessage === "string"
        ? responseOrMessage
        : getBackendSuccessMessage(responseOrMessage);
    if (!message) return null;
    return showFeedbackToast("success", message, title ?? "Operação Concluída", options);
  },

  error: (
    errOrMessage: any,
    fallback?: string,
    title?: string,
    options?: { duration?: number; description?: React.ReactNode }
  ) => {
    const message =
      typeof errOrMessage === "string"
        ? errOrMessage
        : getBackendErrorMessage(errOrMessage, fallback);
    if (!message) return null;
    return showFeedbackToast("error", message, title ?? "Falha na Operação", options);
  },

  warning: (message: React.ReactNode, title?: string, options?: { duration?: number; description?: React.ReactNode }) =>
    showFeedbackToast("warning", message, title ?? "Atenção", options),

  info: (message: React.ReactNode, title?: string, options?: { duration?: number; description?: React.ReactNode }) =>
    showFeedbackToast("info", message, title ?? "Informação", options),
};

export default FeedbackNotification;
