"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  variant?: "modal" | "drawer";
  children: React.ReactNode;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  variant = "modal",
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClass =
    size === "sm"
      ? "max-w-md"
      : size === "lg"
      ? "max-w-2xl"
      : "max-w-xl";

  if (variant === "drawer") {
    return (
      <div
        className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[2px] transition-opacity"
        role="dialog"
        aria-modal="true"
        onClick={onClose}
      >
        <div
          className={`w-full ${sizeClass} h-full flex flex-col border-l border-blue-100 bg-white shadow-2xl transition-transform duration-200`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 bg-white">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#0F172A] truncate">
                {title}
              </h2>
              {description && (
                <p className="mt-0.5 text-xs text-slate-500">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
              aria-label="Cerrar panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/45 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`w-full ${sizeClass} max-h-[92dvh] flex flex-col rounded-t-2xl sm:rounded-2xl border border-blue-100 bg-white shadow-[var(--shadow-modal)] transition-all duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-[#0F172A] truncate">
              {title}
            </h2>
            {description && (
              <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
            aria-label="Cerrar ventana"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
      </div>
    </div>
  );
}
