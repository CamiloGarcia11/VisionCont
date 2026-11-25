"use client";

import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  AgendaStatusBadge,
  EntityBadge,
  PaymentStatusBadge,
} from "@/components/ui/badges";
import { EmptyState } from "@/components/ui/empty-state";
import { getAgendaTypeLabel, getPaymentCategoryLabel } from "@/lib/constants";
import {
  formatCurrency,
  formatDateLong,
  formatTime,
  toIsoDateString,
} from "@/lib/format";
import type { AgendaItemRow, PaymentRow } from "@/types/database";

const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type CalendarEntry =
  | { kind: "payment"; id: string; date: string; timeLabel: string; item: PaymentRow }
  | { kind: "agenda"; id: string; date: string; timeLabel: string; item: AgendaItemRow };

export function ExecutiveCalendar({
  today,
  payments,
  agenda,
  onNewPaymentForDate,
  onNewAgendaForDate,
  onPayPayment,
  onEditPayment,
  onDeletePayment,
  onCompleteAgenda,
  onEditAgenda,
  onDeleteAgenda,
  completingAgendaId,
}: {
  today: string;
  payments: PaymentRow[];
  agenda: AgendaItemRow[];
  onNewPaymentForDate: (date: string) => void;
  onNewAgendaForDate: (date: string) => void;
  onPayPayment: (payment: PaymentRow) => void;
  onEditPayment: (payment: PaymentRow) => void;
  onDeletePayment: (payment: PaymentRow) => void;
  onCompleteAgenda: (item: AgendaItemRow) => void;
  onEditAgenda: (item: AgendaItemRow) => void;
  onDeleteAgenda: (item: AgendaItemRow) => void;
  completingAgendaId: string | null;
}) {
  const [calYear, setCalYear] = useState(() => Number(today.slice(0, 4)));
  const [calMonth, setCalMonth] = useState(() => Number(today.slice(5, 7)) - 1);
  const [selectedDate, setSelectedDate] = useState(today);
  const [showCompleted, setShowCompleted] = useState(false);

  const entriesByDate = useMemo(() => {
    const map = new Map<string, CalendarEntry[]>();

    for (const p of payments) {
      if (p.status === "cancelado") continue;
      if (!showCompleted && p.status === "pagado") continue;
      const list = map.get(p.due_date) ?? [];
      list.push({
        kind: "payment",
        id: p.id,
        date: p.due_date,
        timeLabel: formatTime(p.due_time),
        item: p,
      });
      map.set(p.due_date, list);
    }

    for (const a of agenda) {
      if (a.status === "cancelado") continue;
      if (!showCompleted && a.status === "completado") continue;
      const dateStr = toIsoDateString(a.start_at);
      const list = map.get(dateStr) ?? [];
      list.push({
        kind: "agenda",
        id: a.id,
        date: dateStr,
        timeLabel: a.all_day ? "Todo el día" : formatTime(a.start_at),
        item: a,
      });
      map.set(dateStr, list);
    }

    return map;
  }, [payments, agenda, showCompleted]);

  const calendarCells = useMemo(() => {
    const firstDayUtc = new Date(Date.UTC(calYear, calMonth, 1));
    const jsWeekday = firstDayUtc.getUTCDay();
    const offsetFromMonday = (jsWeekday + 6) % 7;
    const daysInMonth = new Date(
      Date.UTC(calYear, calMonth + 1, 0)
    ).getUTCDate();
    const totalCells = Math.ceil((offsetFromMonday + daysInMonth) / 7) * 7;

    const cells: {
      isoDate: string;
      dayNumber: number;
      inCurrentMonth: boolean;
      entries: CalendarEntry[];
    }[] = [];

    for (let i = 0; i < totalCells; i++) {
      const d = new Date(
        Date.UTC(calYear, calMonth, 1 - offsetFromMonday + i)
      );
      const isoDate = d.toISOString().slice(0, 10);
      cells.push({
        isoDate,
        dayNumber: d.getUTCDate(),
        inCurrentMonth: d.getUTCMonth() === calMonth,
        entries: entriesByDate.get(isoDate) ?? [],
      });
    }
    return cells;
  }, [calYear, calMonth, entriesByDate]);

  const monthLabel = useMemo(() => {
    const d = new Date(Date.UTC(calYear, calMonth, 15));
    return new Intl.DateTimeFormat("es-CO", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  }, [calYear, calMonth]);

  const selectedEntries = useMemo(
    () => entriesByDate.get(selectedDate) ?? [],
    [entriesByDate, selectedDate]
  );

  const goPrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((y) => y - 1);
    } else {
      setCalMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((y) => y + 1);
    } else {
      setCalMonth((m) => m + 1);
    }
  };

  const goToday = () => {
    setCalYear(Number(today.slice(0, 4)));
    setCalMonth(Number(today.slice(5, 7)) - 1);
    setSelectedDate(today);
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-xs)] overflow-hidden">
      {/* Encabezado del calendario */}
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-blue-50/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-semibold text-[#0F172A] capitalize truncate">
              Calendario Operativo · {monthLabel}
            </h2>
            <p className="text-xs text-slate-500">
              Toca un día para ver o registrar pagos y anotaciones
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-[36px] items-center gap-2 rounded-xl border border-blue-200 bg-white px-3 py-1 text-xs font-medium text-[#1E3A8A] cursor-pointer">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="h-3.5 w-3.5 rounded accent-blue-600"
            />
            <span>Mostrar cumplidos</span>
          </label>

          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={goPrevMonth}
              aria-label="Mes anterior"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={goToday}
              className="h-9 rounded-xl border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={goNextMonth}
              aria-label="Mes siguiente"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grilla + Panel del día seleccionado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        {/* Grilla mensual */}
        <div className="lg:col-span-7 min-w-0">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {WEEKDAYS_ES.map((day) => (
              <div
                key={day}
                className="px-1 py-2 text-center text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {calendarCells.map((cell) => {
              const isToday = cell.isoDate === today;
              const isSelected = cell.isoDate === selectedDate;
              const hasOverdue = cell.entries.some(
                (e) =>
                  e.kind === "payment" &&
                  (e.item.status === "vencido" ||
                    (e.item.status === "pendiente" && cell.isoDate < today))
              );

              return (
                <button
                  key={cell.isoDate}
                  type="button"
                  onClick={() => setSelectedDate(cell.isoDate)}
                  className={`min-h-[68px] sm:min-h-[92px] p-1 sm:p-1.5 flex flex-col items-stretch justify-between text-left transition-all duration-150 cursor-pointer min-w-0 ${
                    isSelected
                      ? "bg-blue-50 ring-2 ring-inset ring-blue-600"
                      : cell.inCurrentMonth
                      ? "bg-white hover:bg-blue-50/40"
                      : "bg-slate-50/70 hover:bg-slate-100/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-0.5">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-semibold ${
                        isToday
                          ? "bg-blue-600 text-white"
                          : isSelected
                          ? "text-blue-700"
                          : cell.inCurrentMonth
                          ? "text-[#0F172A]"
                          : "text-slate-400"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {cell.entries.length > 0 && (
                      <span
                        className={`inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-bold ${
                          hasOverdue
                            ? "bg-red-100 text-red-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {cell.entries.length}
                      </span>
                    )}
                  </div>

                  {/* Chips compactos en desktop, puntos en móvil */}
                  <div className="mt-1 space-y-0.5 min-w-0">
                    <div className="flex flex-wrap gap-1 sm:hidden">
                      {cell.entries.slice(0, 4).map((e) => {
                        const isDone =
                          (e.kind === "payment" && e.item.status === "pagado") ||
                          (e.kind === "agenda" &&
                            e.item.status === "completado");
                        const isOverdue =
                          e.kind === "payment" && e.item.status === "vencido";
                        return (
                          <span
                            key={`${e.kind}-${e.id}`}
                            className={`h-1.5 w-1.5 rounded-full ${
                              isDone
                                ? "bg-emerald-500"
                                : isOverdue
                                ? "bg-red-500"
                                : "bg-blue-600"
                            }`}
                          />
                        );
                      })}
                    </div>

                    <div className="hidden sm:block space-y-0.5 min-w-0">
                      {cell.entries.slice(0, 2).map((e) => {
                        const isDone =
                          (e.kind === "payment" && e.item.status === "pagado") ||
                          (e.kind === "agenda" &&
                            e.item.status === "completado");
                        const isOverdue =
                          e.kind === "payment" && e.item.status === "vencido";
                        return (
                          <div
                            key={`${e.kind}-${e.id}`}
                            className={`truncate rounded px-1 py-0.5 text-[10px] font-medium ${
                              isDone
                                ? "bg-emerald-50 text-emerald-700 line-through"
                                : isOverdue
                                ? "bg-red-50 text-red-700"
                                : e.kind === "payment"
                                ? "bg-blue-100/80 text-[#1E3A8A]"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {e.item.title}
                          </div>
                        );
                      })}
                      {cell.entries.length > 2 && (
                        <p className="px-1 text-[10px] font-semibold text-blue-600">
                          +{cell.entries.length - 2} más
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detalle rápido del día seleccionado */}
        <div className="lg:col-span-5 flex flex-col bg-slate-50/40 p-4 sm:p-5 min-w-0">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  {selectedDate === today ? "Día seleccionado · Hoy" : "Día seleccionado"}
                </p>
                <h3 className="text-sm sm:text-base font-semibold capitalize text-[#0F172A] truncate">
                  {formatDateLong(selectedDate)}
                </h3>
              </div>
              <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {selectedEntries.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onNewPaymentForDate(selectedDate)}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Pago este día</span>
              </button>
              <button
                type="button"
                onClick={() => onNewAgendaForDate(selectedDate)}
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#1E3A8A] hover:bg-blue-50 transition-colors cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-blue-600" />
                <span>Anotación / Cita</span>
              </button>
            </div>
          </div>

          <div className="mt-3.5 flex-1 space-y-2.5 overflow-y-auto max-h-[380px] pr-0.5">
            {selectedEntries.length === 0 ? (
              <EmptyState
                icon={<CalendarDays className="h-5 w-5" />}
                title="Día libre"
                description="No hay pagos ni anotaciones pendientes para esta fecha. Usa los botones de arriba para registrar uno."
              />
            ) : (
              selectedEntries.map((entry) =>
                entry.kind === "payment" ? (
                  <div
                    key={`pay-${entry.id}`}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                            <CreditCard className="h-2.5 w-2.5" />
                            {getPaymentCategoryLabel(entry.item.category)}
                          </span>
                          <PaymentStatusBadge status={entry.item.status} />
                          <EntityBadge
                            name={entry.item.entity_name}
                            color={entry.item.entity_color}
                          />
                        </div>
                        <p className="text-sm font-semibold text-[#0F172A] break-words">
                          {entry.item.title}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-[#1E3A8A]">
                        {formatCurrency(
                          entry.item.amount,
                          entry.item.currency
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                        <Clock className="h-3 w-3 text-blue-600" />
                        {entry.timeLabel}
                      </span>
                      <div className="flex items-center gap-1">
                        {entry.item.status !== "pagado" && (
                          <button
                            type="button"
                            onClick={() => onPayPayment(entry.item)}
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Pagado</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditPayment(entry.item)}
                          aria-label="Editar pago"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeletePayment(entry.item)}
                          aria-label="Eliminar pago"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    key={`ag-${entry.id}`}
                    className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                          {getAgendaTypeLabel(entry.item.item_type)}
                        </span>
                        <AgendaStatusBadge status={entry.item.status} />
                        <EntityBadge
                          name={entry.item.entity_name}
                          color={entry.item.entity_color}
                        />
                      </div>
                      <p className="text-sm font-semibold text-[#0F172A] break-words">
                        {entry.item.title}
                      </p>
                      {entry.item.description && (
                        <p className="text-xs text-slate-600 line-clamp-2">
                          {entry.item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-blue-600" />
                          {entry.timeLabel}
                        </span>
                        {entry.item.location && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-blue-600" />
                            {entry.item.location}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {entry.item.status !== "completado" && (
                          <button
                            type="button"
                            disabled={completingAgendaId === entry.item.id}
                            onClick={() => onCompleteAgenda(entry.item)}
                            className="inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 disabled:opacity-50 cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            <span>
                              {completingAgendaId === entry.item.id
                                ? "..."
                                : "Cumplida"}
                            </span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onEditAgenda(entry.item)}
                          aria-label="Editar anotación"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteAgenda(entry.item)}
                          aria-label="Eliminar anotación"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              )
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
