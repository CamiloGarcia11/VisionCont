"use client";

import React, { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastInput {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

interface ToastItem extends ToastInput {
  id: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (input: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const variant = input.variant ?? "info";
      const duration = input.durationMs ?? (variant === "warning" || variant === "error" ? 7000 : 4000);

      setToasts((prev) => [...prev, { ...input, id, variant }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0 pointer-events-none"
      >
        {toasts.map((toast) => {
          const styles: Record<
            ToastVariant,
            { container: string; icon: React.ReactNode }
          > = {
            success: {
              container:
                "border-[var(--status-success-border)] bg-[var(--bg-surface)] text-[var(--text-primary)]",
              icon: (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--status-success-text)]" />
              ),
            },
            warning: {
              container:
                "border-[var(--status-warning-border)] bg-[var(--bg-surface)] text-[var(--text-primary)]",
              icon: (
                <AlertTriangle className="h-5 w-5 shrink-0 text-[var(--status-warning-text)]" />
              ),
            },
            error: {
              container:
                "border-[var(--status-danger-border)] bg-[var(--bg-surface)] text-[var(--text-primary)]",
              icon: (
                <XCircle className="h-5 w-5 shrink-0 text-[var(--status-danger-text)]" />
              ),
            },
            info: {
              container:
                "border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-primary)]",
              icon: (
                <Info className="h-5 w-5 shrink-0 text-[var(--accent-primary)]" />
              ),
            },
          };

          const current = styles[toast.variant];

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-[var(--radius-lg)] border p-3.5 shadow-[var(--shadow-modal)] transition-all ${current.container}`}
            >
              <div className="mt-0.5">{current.icon}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {toast.title}
                </p>
                {toast.description && (
                  <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
                    {toast.description}
                  </p>
                )}
                {toast.actionLabel && toast.onAction && (
                  <button
                    type="button"
                    onClick={() => {
                      const fn = toast.onAction;
                      removeToast(toast.id);
                      void fn?.();
                    }}
                    className="mt-2 inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] bg-[var(--bg-surface-muted)] px-2.5 py-1 text-xs font-medium text-[var(--text-primary)] hover:bg-[var(--border-subtle)] transition-colors"
                  >
                    {toast.actionLabel}
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]"
                aria-label="Cerrar notificación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return ctx;
}
