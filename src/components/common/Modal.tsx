import React from "react";
import { X } from "lucide-react";

interface ModalProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  overflowVisible?: boolean;
}

export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = "max-w-lg",
  overflowVisible = false,
}: ModalProps) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`bg-card border border-border rounded-xl shadow-2xl w-full flex flex-col ${maxWidth} ${
            overflowVisible ? "overflow-visible" : "max-h-[90vh] overflow-y-auto"
          }`}
        >
          <div className="px-5 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-muted/10 z-10 rounded-t-xl shrink-0">
            <div>
              <h3 className="font-semibold text-foreground text-sm">{title}</h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-muted transition-colors"
            >
              <X size={15} className="text-muted-foreground" />
            </button>
          </div>
          <div className={`p-5 flex-1 ${footer ? "" : "rounded-b-xl"}`}>{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/10 rounded-b-xl sticky bottom-0 z-10 shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

