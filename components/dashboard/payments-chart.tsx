"use client";

import React, { useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { getPaymentCategoryLabel } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import type { PaymentRow } from "@/types/database";

interface ChartBucket {
  key: string;
  label: string;
  paid: number;
  pending: number;
  total: number;
}

export function PaymentsChart({
  payments,
  currency,
}: {
  payments: PaymentRow[];
  currency: string;
}) {
  const [groupBy, setGroupBy] = useState<"category" | "entity">("category");

  const buckets = useMemo<ChartBucket[]>(() => {
    const map = new Map<string, ChartBucket>();

    for (const p of payments) {
      if (p.status === "cancelado") continue;
      const key =
        groupBy === "category"
          ? p.category
          : p.entity_name || "Sin asignar";
      const label =
        groupBy === "category"
          ? getPaymentCategoryLabel(p.category)
          : p.entity_name || "Sin asignar";

      const current = map.get(key) ?? {
        key,
        label,
        paid: 0,
        pending: 0,
        total: 0,
      };
      const amount = Number(p.amount || 0);
      if (p.status === "pagado") {
        current.paid += amount;
      } else {
        current.pending += amount;
      }
      current.total = current.paid + current.pending;
      map.set(key, current);
    }

    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [payments, groupBy]);

  const maxTotal = useMemo(
    () => Math.max(1, ...buckets.map((b) => b.total)),
    [buckets]
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-xs)] transition-all duration-200 hover:border-blue-200">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3.5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
            <BarChart3 className="h-4 w-4 text-blue-600 shrink-0" />
            <span className="truncate">
              Comparativa de Pagos (Pagado vs. Pendiente)
            </span>
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Distribución en tiempo real según los filtros seleccionados
          </p>
        </div>

        <div className="inline-flex self-start rounded-xl border border-blue-100 bg-blue-50/70 p-0.5">
          <button
            type="button"
            onClick={() => setGroupBy("category")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
              groupBy === "category"
                ? "bg-white text-blue-700 shadow-xs font-semibold"
                : "text-slate-600 hover:text-blue-700"
            }`}
          >
            Por categoría
          </button>
          <button
            type="button"
            onClick={() => setGroupBy("entity")}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
              groupBy === "entity"
                ? "bg-white text-blue-700 shadow-xs font-semibold"
                : "text-slate-600 hover:text-blue-700"
            }`}
          >
            Por entidad
          </button>
        </div>
      </div>

      {buckets.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-500">
          No hay movimientos registrados para este rango de filtros.
        </p>
      ) : (
        <div className="mt-4 space-y-3.5">
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-600" />
              <span>Pagado</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-blue-200" />
              <span>Pendiente / Vencido</span>
            </span>
          </div>

          <div className="space-y-3">
            {buckets.map((bucket) => {
              const paidPct = Math.round((bucket.paid / maxTotal) * 100);
              const pendingPct = Math.round((bucket.pending / maxTotal) * 100);
              return (
                <div key={bucket.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-medium text-[#0F172A] truncate min-w-0">
                      {bucket.label}
                    </span>
                    <span className="shrink-0 font-semibold text-[#1E3A8A]">
                      {formatCurrency(bucket.total, currency)}
                    </span>
                  </div>
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full bg-blue-600 transition-all duration-500"
                      style={{ width: `${paidPct}%` }}
                      title={`Pagado: ${formatCurrency(bucket.paid, currency)}`}
                    />
                    <div
                      className="h-full bg-blue-200 transition-all duration-500"
                      style={{ width: `${pendingPct}%` }}
                      title={`Pendiente: ${formatCurrency(
                        bucket.pending,
                        currency
                      )}`}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Pagado: {formatCurrency(bucket.paid, currency)}</span>
                    <span>
                      Pendiente: {formatCurrency(bucket.pending, currency)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
