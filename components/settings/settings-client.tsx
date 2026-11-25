"use client";

import React, { useState } from "react";
import {
  Activity,
  Coins,
  Download,
  FileSpreadsheet,
  UserCheck,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { CURRENCIES } from "@/lib/constants";
import { usePreferredCurrency } from "@/lib/currency-preference";
import {
  formatCurrency,
  formatDateShort,
  formatTime,
  getTodayIsoDate,
  type ReportPeriod,
} from "@/lib/format";
import type { ActivityLogRow } from "@/types/database";

const REPORT_OPTIONS: {
  id: ReportPeriod;
  title: string;
  desc: string;
}[] = [
  { id: "diario", title: "Resumen Diario", desc: "Movimientos y agenda de hoy" },
  { id: "semanal", title: "Resumen Semanal", desc: "Semana actual (Lun–Dom)" },
  { id: "mensual", title: "Resumen Mensual", desc: "Consolidado del mes actual" },
  {
    id: "trimestral",
    title: "Resumen Trimestral",
    desc: "Consolidado del trimestre actual",
  },
  { id: "anual", title: "Resumen Anual", desc: "Estadísticas de todo el año" },
];

export function SettingsClient({
  initialProfile,
  initialLogs,
}: {
  initialProfile: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
  initialLogs: ActivityLogRow[];
}) {
  const { showToast } = useToast();
  const [preferredCurrency, setPreferredCurrency] = usePreferredCurrency();
  const [downloading, setDownloading] = useState<ReportPeriod | null>(null);

  const initials = (initialProfile.name || initialProfile.email || "U")
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  const handleDownload = async (period: ReportPeriod) => {
    setDownloading(period);
    try {
      const res = await fetch(`/api/reports/export?period=${period}`);
      if (!res.ok) {
        showToast({ variant: "error", title: "No se pudo descargar el resumen" });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resumen-${period}-${getTodayIsoDate()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast({
        variant: "success",
        title: `Resumen ${period} descargado`,
      });
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0F172A]">
          Configuración y Reportes
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Preferencias de cuenta, moneda, descarga de resúmenes estadísticos y
          registro de actividad
        </p>
      </div>

      {/* 1. Cuenta activa */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-xs)] transition-all duration-200 hover:border-blue-200">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-sm font-semibold text-blue-700">
            {initials}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold text-[#0F172A] truncate">
                {initialProfile.name || "Asistente Gerencial"}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                <UserCheck className="h-3 w-3" />
                <span>Sesión activa</span>
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-600 truncate">
              {initialProfile.email}
            </p>
          </div>
        </div>
      </section>

      {/* 2. Descarga de Resúmenes Estadísticos */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-xs)] transition-all duration-200 hover:border-blue-200 space-y-4">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-[#0F172A]">
            Descargar Resúmenes de Estadísticas (CSV / Excel)
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Exporta el consolidado de pagos pagados, pendientes, vencidos,
          desglose por categoría y eventos/anotaciones de la empresa.
        </p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORT_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              disabled={downloading !== null}
              onClick={() => void handleDownload(opt.id)}
              className="flex min-h-[60px] items-center justify-between gap-3 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-left hover:border-blue-300 hover:bg-blue-50 disabled:opacity-50 transition-all duration-200 cursor-pointer"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#0F172A] truncate">
                  {opt.title}
                </p>
                <p className="text-xs text-slate-500 truncate">{opt.desc}</p>
              </div>
              <Download className="h-4 w-4 shrink-0 text-blue-600" />
            </button>
          ))}
        </div>
      </section>

      {/* 3. Moneda predeterminada */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-xs)] transition-all duration-200 hover:border-blue-200 space-y-3">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-[#0F172A]">
            Moneda predeterminada
          </h2>
        </div>
        <p className="text-xs text-slate-500">
          Define la moneda por defecto para nuevos pagos y totales del tablero.
        </p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <select
            value={preferredCurrency}
            onChange={(e) => {
              setPreferredCurrency(e.target.value);
              showToast({
                variant: "success",
                title: `Moneda predeterminada cambiada a ${e.target.value}`,
              });
            }}
            className="min-h-[44px] w-full max-w-xs rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-[#0F172A] focus:border-blue-600 focus:bg-white focus:outline-none"
          >
            {CURRENCIES.map((cur) => (
              <option key={cur.value} value={cur.value}>
                {cur.label}
              </option>
            ))}
          </select>

          <span className="text-xs text-slate-600">
            Vista previa:{" "}
            <strong className="text-[#1E3A8A]">
              {formatCurrency(1500000, preferredCurrency)}
            </strong>
          </span>
        </div>
      </section>

      {/* 4. Historial reciente (activity_logs) */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-xs)] overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 bg-blue-50/40 px-5 py-3.5">
          <Activity className="h-4 w-4 text-blue-600" />
          <h2 className="text-sm font-semibold text-[#0F172A]">
            Actividad reciente
          </h2>
        </div>

        {initialLogs.length === 0 ? (
          <p className="px-5 py-6 text-xs text-slate-500">
            Sin registros de actividad todavía.
          </p>
        ) : (
          <div className="divide-y divide-slate-100">
            {initialLogs.map((log) => (
              <div
                key={log.id}
                className="flex flex-col gap-1 px-5 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-[#0F172A]">
                  {log.summary}
                </span>
                <span className="shrink-0 text-slate-500">
                  {formatDateShort(log.created_at)} ·{" "}
                  {formatTime(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
