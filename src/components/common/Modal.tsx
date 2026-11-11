import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = "max-w-lg",
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const modalNode = (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div
        className={`relative z-10 bg-card border border-border rounded-xl shadow-2xl w-full max-h-[94vh] flex flex-col ${maxWidth} animate-in fade-in-0 zoom-in-95 duration-150`}
      >
        <div className="px-4 py-3.5 sm:px-5 sm:py-4 border-b border-border flex items-center justify-between sticky top-0 bg-muted/10 z-10 rounded-t-xl shrink-0">
          <div className="min-w-0 pr-2">
            <h3 className="font-semibold text-foreground text-sm truncate">{title}</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        <div
          className={`p-3.5 sm:p-5 flex-1 min-h-0 overflow-y-auto ${
            footer ? "" : "rounded-b-xl"
          }`}
        >
          {children}
        </div>
        {footer && (
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-t border-border bg-muted/10 rounded-b-xl sticky bottom-0 z-10 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document !== "undefined") {
    return createPortal(modalNode, document.body);
  }

  return modalNode;
}

