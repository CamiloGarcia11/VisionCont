"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Plus,
  Search,
} from "lucide-react";
import { AgendaFormModal } from "@/components/agenda/agenda-form-modal";
import { ExecutiveCalendar } from "@/components/dashboard/executive-calendar";
import { PaymentsChart } from "@/components/dashboard/payments-chart";
import { MarkPaidModal } from "@/components/payments/mark-paid-modal";
import { PaymentFormModal } from "@/components/payments/payment-form-modal";
import {
  AgendaStatusBadge,
  EntityBadge,
  PaymentStatusBadge,
} from "@/components/ui/badges";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { KpiGridSkeleton, ListRowsSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { getAgendaTypeLabel, getPaymentCategoryLabel } from "@/lib/constants";
import { usePreferredCurrency } from "@/lib/currency-preference";
import type { DashboardData } from "@/lib/data-queries";
import {
  addDaysToIsoDate,
  formatCurrency,
  formatDateShort,
  formatTime,
  toIsoDateString,
  type ReportPeriod,
} from "@/lib/format";
import type {
  AgendaItemRow,
  ContactRow,
  EntityRow,
  PaymentRow,
} from "@/types/database";

type TimeRangeFilter = "hoy" | "7dias" | "mes";

const REPORT_PERIODS: { id: ReportPeriod; label: string }[] = [
  { id: "diario", label: "Diario" },
  { id: "semanal", label: "Semanal" },
  { id: "mensual", label: "Mensual" },
  { id: "trimestral", label: "Trimestral" },
  { id: "anual", label: "Anual" },
];

type TimelineEntry =
  | {
      kind: "payment";
      id: string;
      sortKey: string;
      date: string;
      time: string;
      item: PaymentRow;
    }
  | {
      kind: "agenda";
      id: string;
      sortKey: string;
      date: string;
      time: string;
      item: AgendaItemRow;
    };

export function DashboardClient({
  initialData,
  entities,
  contacts,
  initialEntityId,
}: {
  initialData: DashboardData;
  entities: EntityRow[];
  contacts: ContactRow[];
  initialEntityId: string;
}) {
  const { showToast } = useToast();
  const [preferredCurrency] = usePreferredCurrency();

  const [data, setData] = useState<DashboardData>(initialData);
  const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId);
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>("7dias");
  const [searchText, setSearchText] = useState("");
  const [loadingFilter, setLoadingFilter] = useState(false);

  // Modales / Drawers desde Dashboard y Calendario
  const [newPaymentOpen, setNewPaymentOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRow | null>(null);
  const [defaultPaymentDate, setDefaultPaymentDate] = useState<
    string | undefined
  >(undefined);

  const [newAgendaOpen, setNewAgendaOpen] = useState(false);
  const [editingAgenda, setEditingAgenda] = useState<AgendaItemRow | null>(
    null
  );
  const [defaultAgendaDate, setDefaultAgendaDate] = useState<
    string | undefined
  >(undefined);

  const [payingItem, setPayingItem] = useState<PaymentRow | null>(null);
  const [completingAgendaId, setCompletingAgendaId] = useState<string | null>(
    null
  );

  const [deletingTarget, setDeletingTarget] = useState<
    | { kind: "payment"; item: PaymentRow }
    | { kind: "agenda"; item: AgendaItemRow }
    | null
  >(null);
  const [deleting, setDeleting] = useState(false);
  const [downloadingPeriod, setDownloadingPeriod] =
    useState<ReportPeriod | null>(null);

  const reloadDashboard = useCallback(
    async (entityId: string) => {
      setLoadingFilter(true);
      try {
        const res = await fetch(
          `/api/dashboard?entityId=${encodeURIComponent(entityId)}`
        );
        if (res.ok) {
          const next = (await res.json()) as DashboardData;
          setData(next);
        }
      } catch {
        showToast({
          variant: "error",
          title: "Error actualizando el tablero",
        });
      } finally {
        setLoadingFilter(false);
      }
    },
    [showToast]
  );

  const handleEntityChange = (nextEntityId: string) => {
    setSelectedEntityId(nextEntityId);
    const url =
      nextEntityId === "todos" ? "/" : `/?entityId=${nextEntityId}`;
    window.history.replaceState(null, "", url);
    void reloadDashboard(nextEntityId);
  };

  const handleCompleteAgenda = async (item: AgendaItemRow) => {
    const snapshot = data;
    setCompletingAgendaId(item.id);

    setData((prev) => ({
      ...prev,
      immediateAgenda: prev.immediateAgenda.filter((a) => a.id !== item.id),
      upcoming7DaysAgenda: prev.upcoming7DaysAgenda.filter(
        (a) => a.id !== item.id
      ),
      scopedAgenda: prev.scopedAgenda.map((a) =>
        a.id === item.id ? { ...a, status: "completado" } : a
      ),
    }));

    try {
      const res = await fetch(`/api/agenda/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completado" }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setData(snapshot);
        showToast({
          variant: "error",
          title: "No se pudo completar",
          description: json.error,
        });
        return;
      }

      showToast({
        variant: "success",
        title: `"${item.title}" marcado como cumplido`,
      });
      void reloadDashboard(selectedEntityId);
    } catch {
      setData(snapshot);
      showToast({
        variant: "error",
        title: "Error de conexión al completar",
      });
    } finally {
      setCompletingAgendaId(null);
    }
  };

  const handleOptimisticPay = useCallback((paymentId: string) => {
    setData((prev) => ({
      ...prev,
      immediatePayments: prev.immediatePayments.filter(
        (p) => p.id !== paymentId
      ),
      upcoming7DaysPayments: prev.upcoming7DaysPayments.filter(
        (p) => p.id !== paymentId
      ),
      scopedPayments: prev.scopedPayments.map((p) =>
        p.id === paymentId
          ? { ...p, status: "pagado", paid_at: new Date().toISOString() }
          : p
      ),
    }));
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingTarget) return;
    setDeleting(true);
    try {
      const endpoint =
        deletingTarget.kind === "payment"
          ? `/api/payments/${deletingTarget.item.id}`
          : `/api/agenda/${deletingTarget.item.id}`;
      const res = await fetch(endpoint, { method: "DELETE" });
      if (!res.ok) {
        showToast({ variant: "error", title: "No se pudo eliminar" });
        return;
      }
      showToast({
        variant: "success",
        title:
          deletingTarget.kind === "payment"
            ? "Pago eliminado"
            : "Anotación eliminada",
      });
      setDeletingTarget(null);
      await reloadDashboard(selectedEntityId);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownloadReport = async (period: ReportPeriod) => {
    setDownloadingPeriod(period);
    try {
      const res = await fetch(
        `/api/reports/export?period=${encodeURIComponent(
          period
        )}&entityId=${encodeURIComponent(selectedEntityId)}`
      );
      if (!res.ok) {
        showToast({
          variant: "error",
          title: "No se pudo generar el resumen",
        });
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resumen-${period}-${data.today}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast({
        variant: "success",
        title: `Resumen ${period} descargado`,
      });
    } finally {
      setDownloadingPeriod(null);
    }
  };

  const sevenDaysEnd = useMemo(
    () => addDaysToIsoDate(data.today, 7),
    [data.today]
  );
  const normalizedQuery = searchText.trim().toLowerCase();

  const matchesSearch = useCallback(
    (
      title: string,
      desc?: string | null,
      entityName?: string | null,
      extra?: string | null
    ) => {
      if (!normalizedQuery) return true;
      return (
        title.toLowerCase().includes(normalizedQuery) ||
        (desc ?? "").toLowerCase().includes(normalizedQuery) ||
        (entityName ?? "").toLowerCase().includes(normalizedQuery) ||
        (extra ?? "").toLowerCase().includes(normalizedQuery)
      );
    },
    [normalizedQuery]
  );

  const matchesRangeDate = useCallback(
    (isoDate: string) => {
      if (timeRange === "hoy") return isoDate === data.today;
      if (timeRange === "7dias") {
        return isoDate >= data.today && isoDate <= sevenDaysEnd;
      }
      return isoDate >= data.monthStart && isoDate <= data.monthEnd;
    },
    [timeRange, data.today, data.monthStart, data.monthEnd, sevenDaysEnd]
  );

  const filteredScopedPayments = useMemo(
    () =>
      data.scopedPayments.filter(
        (p) =>
          (selectedEntityId === "todos" || p.entity_id === selectedEntityId) &&
          matchesSearch(p.title, p.description, p.entity_name, p.contact_name)
      ),
    [data.scopedPayments, selectedEntityId, matchesSearch]
  );

  const filteredScopedAgenda = useMemo(
    () =>
      data.scopedAgenda.filter(
        (a) =>
          (selectedEntityId === "todos" || a.entity_id === selectedEntityId) &&
          matchesSearch(a.title, a.description, a.entity_name, a.location)
      ),
    [data.scopedAgenda, selectedEntityId, matchesSearch]
  );

  const filteredChartPayments = useMemo(
    () =>
      filteredScopedPayments.filter(
        (p) => p.status === "vencido" || matchesRangeDate(p.due_date)
      ),
    [filteredScopedPayments, matchesRangeDate]
  );

  const dynamicKpis = useMemo(() => {
    const pendingInRange = filteredScopedPayments.filter(
      (p) =>
        p.status !== "pagado" &&
        p.status !== "cancelado" &&
        (p.status === "vencido" || matchesRangeDate(p.due_date))
    );

    const paidInRange = filteredScopedPayments.filter((p) => {
      if (p.status !== "pagado") return false;
      const paidDate = p.paid_at ? toIsoDateString(p.paid_at) : p.due_date;
      return matchesRangeDate(paidDate) || matchesRangeDate(p.due_date);
    });

    const overdue = filteredScopedPayments.filter(
      (p) => p.status === "vencido"
    );

    const upcomingAgendaCount = filteredScopedAgenda.filter(
      (a) =>
        a.status !== "completado" &&
        a.status !== "cancelado" &&
        matchesRangeDate(toIsoDateString(a.start_at))
    ).length;

    const upcomingPayCount = filteredScopedPayments.filter(
      (p) =>
        p.status !== "pagado" &&
        p.status !== "cancelado" &&
        p.status !== "vencido" &&
        matchesRangeDate(p.due_date)
    ).length;

    return {
      pendingAmount: pendingInRange.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      ),
      pendingCount: pendingInRange.length,
      paidAmount: paidInRange.reduce(
        (sum, p) => sum + Number(p.amount || 0),
        0
      ),
      paidCount: paidInRange.length,
      overdueCount: overdue.length,
      overdueAmount: overdue.reduce((sum, p) => sum + Number(p.amount || 0), 0),
      upcomingCount: upcomingPayCount + upcomingAgendaCount,
    };
  }, [filteredScopedPayments, filteredScopedAgenda, matchesRangeDate]);

  const filteredImmediatePayments = useMemo(
    () =>
      data.immediatePayments.filter((p) =>
        matchesSearch(p.title, p.description, p.entity_name, p.contact_name)
      ),
    [data.immediatePayments, matchesSearch]
  );

  const filteredImmediateAgenda = useMemo(
    () =>
      data.immediateAgenda.filter((a) =>
        matchesSearch(a.title, a.description, a.entity_name, a.location)
      ),
    [data.immediateAgenda, matchesSearch]
  );

  const upcomingTimeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];

    for (const p of filteredScopedPayments) {
      if (
        p.status === "pagado" ||
        p.status === "cancelado" ||
        p.status === "vencido"
      ) {
        continue;
      }
      if (!matchesRangeDate(p.due_date)) continue;
      const timeStr = p.due_time ? p.due_time.slice(0, 5) : "09:00";
      entries.push({
        kind: "payment",
        id: p.id,
        sortKey: `${p.due_date}T${timeStr}`,
        date: p.due_date,
        time: formatTime(timeStr),
        item: p,
      });
    }

    for (const a of filteredScopedAgenda) {
      if (a.status === "completado" || a.status === "cancelado") continue;
      const dateStr = toIsoDateString(a.start_at);
      if (!matchesRangeDate(dateStr)) continue;
      const timeStr = a.all_day ? "Todo el día" : formatTime(a.start_at);
      const sortTime = a.all_day
        ? "00:00"
        : new Date(a.start_at).toISOString().slice(11, 16);
      entries.push({
        kind: "agenda",
        id: a.id,
        sortKey: `${dateStr}T${sortTime}`,
        date: dateStr,
        time: timeStr,
        item: a,
      });
    }

    return entries.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [filteredScopedPayments, filteredScopedAgenda, matchesRangeDate]);

  const hasOverdue = dynamicKpis.overdueCount > 0;
  const immediateTotal =
    filteredImmediatePayments.length + filteredImmediateAgenda.length;
  const totalVolume = dynamicKpis.paidAmount + dynamicKpis.pendingAmount;
  const paidProgressPct =
    totalVolume > 0
      ? Math.round((dynamicKpis.paidAmount / totalVolume) * 100)
      : 0;

  const rangeLabel =
    timeRange === "hoy"
      ? "hoy"
      : timeRange === "7dias"
      ? "próximos 7 días"
      : "este mes";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      {/* Cabecera ejecutiva */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0F172A]">
            Panel Ejecutivo
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Control diario de pagos, trámites, anotaciones y estadísticas · Hoy{" "}
            {formatDateShort(data.today)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setEditingPayment(null);
              setDefaultPaymentDate(undefined);
              setNewPaymentOpen(true);
            }}
            className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Nuevo Pago</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingAgenda(null);
              setDefaultAgendaDate(undefined);
              setNewAgendaOpen(true);
            }}
            className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-[#1E3A8A] hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-4 w-4 shrink-0 text-blue-600" />
            <span>Nueva Anotación / Cita</span>
          </button>
        </div>
      </div>

      {/* Barra de filtros + Descarga rápida de resúmenes */}
      <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-[var(--shadow-xs)] space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center flex-1 min-w-0">
            <select
              aria-label="Filtrar por entidad"
              value={selectedEntityId}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="min-h-[44px] w-full sm:w-56 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 text-sm font-medium text-[#0F172A] focus:border-blue-600 focus:bg-white focus:outline-none transition-all duration-200"
            >
              <option value="todos">Todas las entidades</option>
              {entities.map((ent) => (
                <option key={ent.id} value={ent.id}>
                  {ent.name}
                </option>
              ))}
            </select>

            <div className="relative flex-1 min-w-0">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Filtrar en tiempo real por concepto, entidad o proveedor..."
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-none transition-all duration-200"
              />
            </div>
          </div>

          <div
            role="group"
            aria-label="Rango de tiempo"
            className="inline-flex w-full sm:w-auto rounded-xl border border-blue-100 bg-blue-50/70 p-1"
          >
            {(
              [
                { id: "hoy", label: "Hoy" },
                { id: "7dias", label: "Próximos 7 días" },
                { id: "mes", label: "Este mes" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTimeRange(opt.id)}
                className={`flex-1 sm:flex-none min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  timeRange === opt.id
                    ? "bg-blue-600 text-white shadow-xs font-semibold"
                    : "text-slate-600 hover:text-blue-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Descarga de Resúmenes Estadísticos (Diario, Semanal, Mensual, Trimestral, Anual) */}
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <Download className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <span>Descargar resumen ejecutivo de estadísticas:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {REPORT_PERIODS.map((rep) => (
              <button
                key={rep.id}
                type="button"
                disabled={downloadingPeriod !== null}
                onClick={() => void handleDownloadReport(rep.id)}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Download className="h-3 w-3" />
                <span>
                  {downloadingPeriod === rep.id ? "Generando..." : rep.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Tarjetas KPI */}
      {loadingFilter ? (
        <KpiGridSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-xs)] transition-all duration-200 hover:border-blue-300 hover:shadow-md">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
              <span className="truncate">Pendiente ({rangeLabel})</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CreditCard className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-[#0F172A] truncate">
              {formatCurrency(dynamicKpis.pendingAmount, preferredCurrency)}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {dynamicKpis.pendingCount} obligación(es) por pagar
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-xs)] transition-all duration-200 hover:border-blue-300 hover:shadow-md">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
              <span className="truncate">Pagado ({rangeLabel})</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-[#0F172A] truncate">
              {formatCurrency(dynamicKpis.paidAmount, preferredCurrency)}
            </p>
            <div className="mt-2 space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-blue-50">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-500"
                  style={{ width: `${paidProgressPct}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-500">
                {dynamicKpis.paidCount} pagado(s) · {paidProgressPct}% cubierto
              </p>
            </div>
          </div>

          <div
            className={`rounded-2xl border p-5 shadow-[var(--shadow-xs)] transition-all duration-200 hover:shadow-md ${
              hasOverdue
                ? "border-red-200 bg-red-50/70 hover:border-red-300"
                : "border-slate-200 bg-white hover:border-blue-300"
            }`}
          >
            <div
              className={`flex items-center justify-between gap-2 text-xs font-medium ${
                hasOverdue ? "text-red-700" : "text-slate-500"
              }`}
            >
              <span className="truncate">Pagos vencidos</span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                  hasOverdue
                    ? "bg-red-100 text-red-700"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                <AlertCircle className="h-4 w-4" />
              </span>
            </div>
            <p
              className={`mt-3 text-2xl font-bold tracking-tight ${
                hasOverdue ? "text-red-700" : "text-[#0F172A]"
              }`}
            >
              {dynamicKpis.overdueCount}
            </p>
            <p
              className={`mt-1 text-xs ${
                hasOverdue ? "text-red-700" : "text-slate-500"
              }`}
            >
              {hasOverdue
                ? `${formatCurrency(
                    dynamicKpis.overdueAmount,
                    preferredCurrency
                  )} por regularizar`
                : "Sin pagos vencidos"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-xs)] transition-all duration-200 hover:border-blue-300 hover:shadow-md">
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-slate-500">
              <span className="truncate">Compromisos ({rangeLabel})</span>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <CalendarClock className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tracking-tight text-[#0F172A]">
              {dynamicKpis.upcomingCount}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Pagos y anotaciones activas del periodo
            </p>
          </div>
        </div>
      )}

      {/* Calendario Operativo Dinámico (Pagos + Anotaciones / Citas) */}
      <ExecutiveCalendar
        today={data.today}
        payments={filteredScopedPayments}
        agenda={filteredScopedAgenda}
        completingAgendaId={completingAgendaId}
        onNewPaymentForDate={(date) => {
          setEditingPayment(null);
          setDefaultPaymentDate(date);
          setNewPaymentOpen(true);
        }}
        onNewAgendaForDate={(date) => {
          setEditingAgenda(null);
          setDefaultAgendaDate(date);
          setNewAgendaOpen(true);
        }}
        onPayPayment={(p) => setPayingItem(p)}
        onEditPayment={(p) => {
          setEditingPayment(p);
          setDefaultPaymentDate(undefined);
          setNewPaymentOpen(true);
        }}
        onDeletePayment={(p) => setDeletingTarget({ kind: "payment", item: p })}
        onCompleteAgenda={(a) => void handleCompleteAgenda(a)}
        onEditAgenda={(a) => {
          setEditingAgenda(a);
          setDefaultAgendaDate(undefined);
          setNewAgendaOpen(true);
        }}
        onDeleteAgenda={(a) => setDeletingTarget({ kind: "agenda", item: a })}
      />

      {/* Gráfica comparativa dinámica en tonos azules */}
      <PaymentsChart
        payments={filteredChartPayments}
        currency={preferredCurrency}
      />

      {/* Dos columnas: Atención Inmediata & Cronograma */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-xs)] flex flex-col min-w-0">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[#0F172A]">
                Atención Inmediata
              </h2>
              <p className="text-xs text-slate-500">
                Pagos vencidos, vencimientos de hoy y anotaciones del día
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
              {immediateTotal}
            </span>
          </div>

          {loadingFilter ? (
            <ListRowsSkeleton rows={3} />
          ) : (
            <div className="divide-y divide-slate-100 p-2">
              {immediateTotal === 0 ? (
                <div className="p-3">
                  <EmptyState
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    title="Todo al día por hoy"
                    description="No tienes pagos vencidos, facturas para hoy ni anotaciones pendientes con este filtro."
                  />
                </div>
              ) : (
                <>
                  {filteredImmediatePayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-3 rounded-xl p-3 hover:bg-blue-50/40 transition-colors sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <PaymentStatusBadge status={payment.status} />
                          <EntityBadge
                            name={payment.entity_name}
                            color={payment.entity_color}
                          />
                          <span className="text-xs text-slate-500">
                            {getPaymentCategoryLabel(payment.category)}
                          </span>
                        </div>
                        <p className="truncate text-sm font-semibold text-[#0F172A]">
                          {payment.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          <span className="font-bold text-[#1E3A8A]">
                            {formatCurrency(payment.amount, payment.currency)}
                          </span>
                          <span>
                            Vence: {formatDateShort(payment.due_date)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setPayingItem(payment)}
                        className="inline-flex min-h-[44px] sm:min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Marcar pagado</span>
                      </button>
                    </div>
                  ))}

                  {filteredImmediateAgenda.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-xl p-3 hover:bg-blue-50/40 transition-colors sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <AgendaStatusBadge status={item.status} />
                          <EntityBadge
                            name={item.entity_name}
                            color={item.entity_color}
                          />
                          <span className="text-xs text-slate-500">
                            {getAgendaTypeLabel(item.item_type)}
                          </span>
                        </div>
                        <p className="truncate text-sm font-semibold text-[#0F172A]">
                          {item.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 text-blue-600" />
                            {formatDateShort(item.start_at)} ·{" "}
                            {item.all_day
                              ? "Todo el día"
                              : formatTime(item.start_at)}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={completingAgendaId === item.id}
                        onClick={() => void handleCompleteAgenda(item)}
                        className="inline-flex min-h-[44px] sm:min-h-[36px] shrink-0 items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>
                          {completingAgendaId === item.id
                            ? "Completando..."
                            : "Completar"}
                        </span>
                      </button>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </section>

        <section className="lg:col-span-6 rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-xs)] flex flex-col min-w-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-[#0F172A] capitalize">
                Cronograma · {rangeLabel}
              </h2>
              <p className="text-xs text-slate-500">
                Línea cronológica de pagos, trámites y anotaciones
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <Link
                href="/pagos"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
              >
                <span>Pagos</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href="/agenda"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 hover:underline"
              >
                <span>Agenda</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {loadingFilter ? (
            <ListRowsSkeleton rows={3} />
          ) : (
            <div className="divide-y divide-slate-100 p-2">
              {upcomingTimeline.length === 0 ? (
                <div className="p-3">
                  <EmptyState
                    icon={<CalendarClock className="h-5 w-5" />}
                    title={`Sin compromisos para ${rangeLabel}`}
                    description="Agrega un nuevo pago, cita o anotación en el calendario o cambia el rango de tiempo."
                  />
                </div>
              ) : (
                upcomingTimeline.map((entry) => (
                  <div
                    key={`${entry.kind}-${entry.id}`}
                    className="flex flex-col gap-2.5 rounded-xl p-3 hover:bg-blue-50/40 transition-colors sm:flex-row sm:items-start sm:justify-between"
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="w-20 shrink-0 rounded-xl border border-blue-100 bg-blue-50/60 px-2 py-1.5 text-center">
                        <p className="text-[11px] font-semibold text-[#1E3A8A]">
                          {formatDateShort(entry.date)}
                        </p>
                        <p className="text-[10px] text-blue-600">
                          {entry.time}
                        </p>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                            {entry.kind === "payment"
                              ? "Pago"
                              : getAgendaTypeLabel(entry.item.item_type)}
                          </span>
                          <EntityBadge
                            name={entry.item.entity_name}
                            color={entry.item.entity_color}
                          />
                        </div>

                        <p className="truncate text-sm font-semibold text-[#0F172A]">
                          {entry.item.title}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 sm:text-right pl-[92px] sm:pl-0">
                      {entry.kind === "payment" ? (
                        <p className="text-sm font-bold text-[#1E3A8A]">
                          {formatCurrency(
                            entry.item.amount,
                            entry.item.currency
                          )}
                        </p>
                      ) : (
                        <AgendaStatusBadge status={entry.item.status} />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>

      {/* Drawers / Modales rápidos */}
      <PaymentFormModal
        open={newPaymentOpen}
        onClose={() => {
          setNewPaymentOpen(false);
          setEditingPayment(null);
          setDefaultPaymentDate(undefined);
        }}
        payment={editingPayment}
        entities={entities}
        contacts={contacts}
        defaultEntityId={selectedEntityId}
        defaultDate={defaultPaymentDate}
        onSaved={() => void reloadDashboard(selectedEntityId)}
      />

      <AgendaFormModal
        open={newAgendaOpen}
        onClose={() => {
          setNewAgendaOpen(false);
          setEditingAgenda(null);
          setDefaultAgendaDate(undefined);
        }}
        item={editingAgenda}
        entities={entities}
        defaultEntityId={selectedEntityId}
        defaultDate={defaultAgendaDate}
        onSaved={() => void reloadDashboard(selectedEntityId)}
      />

      <MarkPaidModal
        open={Boolean(payingItem)}
        onClose={() => setPayingItem(null)}
        payment={payingItem}
        onOptimisticPay={handleOptimisticPay}
        onCompleted={() => void reloadDashboard(selectedEntityId)}
      />

      <ConfirmDialog
        open={Boolean(deletingTarget)}
        onClose={() => setDeletingTarget(null)}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={
          deletingTarget?.kind === "payment"
            ? "Eliminar pago"
            : "Eliminar anotación / evento"
        }
        description={`¿Seguro que deseas eliminar "${deletingTarget?.item.title}" del calendario?`}
      />
    </div>
  );
}
