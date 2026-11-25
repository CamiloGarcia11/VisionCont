"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/modal";

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Eliminar",
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <p className="text-sm text-[var(--text-secondary)]">{description}</p>
      </div>
      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className="rounded-[var(--radius-md)] bg-[var(--status-danger-text)] px-3.5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Procesando..." : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
