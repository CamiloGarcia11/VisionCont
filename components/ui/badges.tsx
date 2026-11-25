import React from "react";
import {
  getAgendaStatusLabel,
  getPaymentStatusLabel,
  getPriorityLabel,
} from "@/lib/constants";

type BadgeTone = "success" | "warning" | "info" | "danger" | "neutral";

const TONE_CLASSES: Record<BadgeTone, string> = {
  success:
    "bg-[var(--status-success-bg)] text-[var(--status-success-text)] border-[var(--status-success-border)]",
  warning:
    "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border-[var(--status-warning-border)]",
  info:
    "bg-blue-50 text-blue-700 border-blue-200",
  danger:
    "bg-[var(--status-danger-bg)] text-[var(--status-danger-text)] border-[var(--status-danger-border)]",
  neutral:
    "bg-slate-100 text-slate-700 border-slate-200",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, BadgeTone> = {
    pagado: "success",
    pendiente: "warning",
    en_proceso: "info",
    vencido: "danger",
    cancelado: "neutral",
  };
  return (
    <Badge tone={toneMap[status] ?? "neutral"}>
      {getPaymentStatusLabel(status)}
    </Badge>
  );
}

export function AgendaStatusBadge({ status }: { status: string }) {
  const toneMap: Record<string, BadgeTone> = {
    completado: "success",
    pendiente: "warning",
    en_progreso: "info",
    cancelado: "neutral",
  };
  return (
    <Badge tone={toneMap[status] ?? "neutral"}>
      {getAgendaStatusLabel(status)}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  const toneMap: Record<string, BadgeTone> = {
    urgente: "danger",
    alta: "warning",
    media: "info",
    baja: "neutral",
  };
  return (
    <Badge tone={toneMap[priority] ?? "neutral"}>
      {getPriorityLabel(priority)}
    </Badge>
  );
}

export function EntityBadge({
  name,
  color,
}: {
  name: string | null | undefined;
  color?: string | null;
}) {
  if (!name) {
    return (
      <span className="text-xs text-slate-400">Sin asignar</span>
    );
  }
  const dotColor = color || "#2563EB";
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50/60 px-2.5 py-0.5 text-xs font-medium text-[#1E3A8A] whitespace-nowrap max-w-full">
      <span
        className="h-2 w-2 rounded-full shrink-0"
        style={{ backgroundColor: dotColor }}
      />
      <span className="truncate max-w-[140px]">{name}</span>
    </span>
  );
}
