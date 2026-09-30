import React, { useEffect } from "react";
import { AlertTriangle, Trash2, CheckCircle, Info } from "lucide-react";

export type ConfirmationVariant = "danger" | "warning" | "success" | "info";

export interface ConfirmationModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  icon?: React.ReactNode;
  isLoading?: boolean;
}

export default function ConfirmationModal({
  open,
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "danger",
  icon,
  isLoading = false,
}: ConfirmationModalProps) {
  const visible = open ?? isOpen ?? false;

  useEffect(() => {
    if (!visible) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [visible, onClose, isLoading]);

  if (!visible) return null;

  const getIcon = () => {
    if (icon) return icon;
    switch (variant) {
      case "danger":
        return <Trash2 size={22} className="text-destructive" />;
      case "warning":
        return <AlertTriangle size={22} className="text-amber-600 dark:text-amber-500" />;
      case "success":
        return <CheckCircle size={22} className="text-emerald-600 dark:text-emerald-500" />;
      case "info":
      default:
        return <Info size={22} className="text-primary" />;
    }
  };

  const getIconWrapperClass = () => {
    switch (variant) {
      case "danger":
        return "bg-destructive/10 text-destructive";
      case "warning":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-500";
      case "success":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500";
      case "info":
      default:
        return "bg-primary/10 text-primary";
    }
  };

  const getConfirmButtonClass = () => {
    switch (variant) {
      case "danger":
        return "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive";
      case "warning":
        return "bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500";
      case "success":
        return "bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500";
      case "info":
      default:
        return "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-primary";
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={() => {
          if (!isLoading) onClose();
        }}
      />

      {/* Modal Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-sm p-6 text-center pointer-events-auto transform transition-all animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon Badge */}
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${getIconWrapperClass()}`}
          >
            {getIcon()}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-foreground text-base mb-1.5">{title}</h3>

          {/* Body / Description */}
          <div className="text-xs text-muted-foreground leading-relaxed mb-6">
            {description}
          </div>

          {/* Action buttons with strict uniform sizing and ordering: Cancel on Left, Confirm on Right */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isLoading}
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              disabled={isLoading}
              onClick={onConfirm}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium shadow-xs transition-colors disabled:opacity-50 ${getConfirmButtonClass()}`}
            >
              {isLoading ? "A processar..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
