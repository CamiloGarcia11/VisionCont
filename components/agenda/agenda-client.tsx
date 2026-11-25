"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Calendar as CalendarIcon,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  List,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { AgendaFormModal } from "@/components/agenda/agenda-form-modal";
import {
  AgendaStatusBadge,
  EntityBadge,
  PriorityBadge,
} from "@/components/ui/badges";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ListRowsSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  AGENDA_ITEM_TYPES,
  AGENDA_STATUSES,
  getAgendaTypeLabel,
} from "@/lib/constants";
import {
  formatDateLong,
  formatTime,
  getTodayIsoDate,
  toIsoDateString,
} from "@/lib/format";
import type { AgendaItemRow, EntityRow } from "@/types/database";

const WEEKDAYS_ES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function AgendaClient({
  initialItems,
  entities,
  initialSearch = "",
}: {
  initialItems: AgendaItemRow[];
  entities: EntityRow[];
  initialSearch?: string;
}) {
  const { showToast } = useToast();

  const [items, setItems] = useState<AgendaItemRow[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  // Filtros
  const [entityFilter, setEntityFilter] = useState("todos");
  const [typeFilter, setTypeFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchText, setSearchText] = useState(initialSearch);

  // Mes actual del calendario
  const todayIso = getTodayIsoDate();
  const [calYear, setCalYear] = useState(() => Number(todayIso.slice(0, 4)));
  const [calMonth, setCalMonth] = useState(
    () => Number(todayIso.slice(5, 7)) - 1
  );

  // Modales y acciones
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AgendaItemRow | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  const [deletingItem, setDeletingItem] = useState<AgendaItemRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const fetchAgenda = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (entityFilter !== "todos") params.set("entityId", entityFilter);
      if (typeFilter !== "todos") params.set("itemType", typeFilter);
      if (statusFilter !== "todos") params.set("status", statusFilter);
      if (searchText.trim()) params.set("search", searchText.trim());

      const res = await fetch(`/api/agenda?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as { items: AgendaItemRow[] };
        setItems(json.items);
      }
    } catch {
      showToast({ variant: "error", title: "Error cargando la agenda" });
    } finally {
      setLoading(false);
    }
  }, [entityFilter, typeFilter, statusFilter, searchText, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchAgenda();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchAgenda]);

  // Actualización optimista al marcar completado
  const handleComplete = async (item: AgendaItemRow) => {
    const snapshot = items;
    setCompletingId(item.id);
    setItems((prev) =>
      prev.map((it) =>
        it.id === item.id ? { ...it, status: "completado" } : it
      )
    );

    try {
      const res = await fetch(`/api/agenda/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completado" }),
      });
      const json = (await res.json()) as {
        error?: string;
      };
      if (!res.ok) {
        setItems(snapshot);
        showToast({
          variant: "error",
          title: "No se pudo completar",
          description: json.error,
        });
        return;
      }

      showToast({
        variant: "success",
        title: `"${item.title}" marcado como listo`,
      });
      void fetchAgenda();
    } catch {
      setItems(snapshot);
      showToast({ variant: "error", title: "Error de conexión" });
    } finally {
      setCompletingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agenda/${deletingItem.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        showToast({
          variant: "error",
          title: "No se pudo eliminar",
          description: json.error,
        });
        return;
      }
      showToast({
        variant: "success",
        title: "Elemento eliminado",
      });
      setDeletingItem(null);
      await fetchAgenda();
    } finally {
      setDeleting(false);
    }
  };

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, AgendaItemRow[]>();
    for (const item of items) {
      const key = toIsoDateString(item.start_at);
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    }
    return Array.from(groups.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
  }, [items]);

  const calendarCells = useMemo(() => {
    const firstDayUtc = new Date(Date.UTC(calYear, calMonth, 1));
    const jsWeekday = firstDayUtc.getUTCDay();
    const offsetFromMonday = (jsWeekday + 6) % 7;
    const daysInMonth = new Date(
      Date.UTC(calYear, calMonth + 1, 0)
    ).getUTCDate();
    const totalCells = Math.ceil((offsetFromMonday + daysInMonth) / 7) * 7;

    const byDate = new Map<string, AgendaItemRow[]>();
    for (const item of items) {
      const key = toIsoDateString(item.start_at);
      const list = byDate.get(key) ?? [];
      list.push(item);
      byDate.set(key, list);
    }

    const cells: {
      isoDate: string;
      dayNumber: number;
      inCurrentMonth: boolean;
      dayItems: AgendaItemRow[];
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
        dayItems: byDate.get(isoDate) ?? [],
      });
    }
    return cells;
  }, [calYear, calMonth, items]);

  const currentMonthLabel = useMemo(() => {
    const d = new Date(Date.UTC(calYear, calMonth, 15));
    return new Intl.DateTimeFormat("es-CO", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(d);
  }, [calYear, calMonth]);

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
    setCalYear(Number(todayIso.slice(0, 4)));
    setCalMonth(Number(todayIso.slice(5, 7)) - 1);
  };

  const inputClass =
    "min-h-[40px] rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-sm text-[#0F172A] focus:border-blue-600 focus:bg-white focus:outline-none transition-all duration-200";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0F172A]">
            Agenda, Trámites y Vencimientos
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Reuniones de directivos, viajes, trámites legales y renovación de
            pólizas o certificados
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switch de Vista Lista / Calendario */}
          <div className="inline-flex flex-1 sm:flex-none rounded-xl border border-blue-100 bg-blue-50/70 p-1">
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`inline-flex flex-1 sm:flex-none min-h-[36px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                viewMode === "list"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-blue-700"
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Lista por fecha</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("calendar")}
              className={`inline-flex flex-1 sm:flex-none min-h-[36px] items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
                viewMode === "calendar"
                  ? "bg-blue-600 text-white shadow-xs font-semibold"
                  : "text-slate-600 hover:text-blue-700"
              }`}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span>Calendario mensual</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setDefaultDate(undefined);
              setFormOpen(true);
            }}
            className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Evento / Trámite</span>
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-xs)] sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-2 min-w-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Buscar evento, documento, ubicación..."
            className={`${inputClass} w-full pl-9`}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={inputClass}
          aria-label="Filtrar por tipo"
        >
          <option value="todos">Todos los tipos</option>
          {AGENDA_ITEM_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className={inputClass}
          aria-label="Filtrar por estado"
        >
          <option value="todos">Todos los estados</option>
          {AGENDA_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={entityFilter}
          onChange={(e) => setEntityFilter(e.target.value)}
          className={inputClass}
          aria-label="Filtrar por entidad"
        >
          <option value="todos">Todas las entidades</option>
          {entities.map((ent) => (
            <option key={ent.id} value={ent.id}>
              {ent.name}
            </option>
          ))}
        </select>
      </div>

      {/* Contenido según modo */}
      {viewMode === "list" ? (
        loading && items.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white">
            <ListRowsSkeleton rows={4} />
          </div>
        ) : groupedByDate.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="No hay eventos o trámites programados"
            description="Registra citas de los jefes, renovaciones de documentos o trámites legales para llevar control permanente en tu agenda."
            action={
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setDefaultDate(undefined);
                  setFormOpen(true);
                }}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                <span>Agendar ahora</span>
              </button>
            }
          />
        ) : (
          <div className="space-y-4">
            {groupedByDate.map(([dateKey, dayItems]) => (
              <section
                key={dateKey}
                className="rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-xs)] overflow-hidden"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-blue-50/50 px-4 py-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate text-xs font-semibold capitalize text-[#1E3A8A]">
                      {formatDateLong(dateKey)}
                    </span>
                    {dateKey === todayIso && (
                      <span className="shrink-0 rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                        Hoy
                      </span>
                    )}
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {dayItems.length} elemento(s)
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 px-4 py-3.5 hover:bg-blue-50/35 transition-colors sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                            {getAgendaTypeLabel(item.item_type)}
                          </span>
                          <AgendaStatusBadge status={item.status} />
                          <PriorityBadge priority={item.priority} />
                          <EntityBadge
                            name={item.entity_name}
                            color={item.entity_color}
                          />
                        </div>

                        <p className="text-sm font-semibold text-[#0F172A] break-words">
                          {item.title}
                        </p>

                        {item.description && (
                          <p className="text-xs text-slate-600 line-clamp-2 break-words">
                            {item.description}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                            {item.all_day
                              ? "Todo el día"
                              : `${formatTime(item.start_at)}${
                                  item.end_at
                                    ? ` – ${formatTime(item.end_at)}`
                                    : ""
                                }`}
                          </span>
                          {item.location && (
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                              <span className="truncate">{item.location}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap sm:flex-nowrap shrink-0 items-center gap-1.5">
                        {item.status !== "completado" &&
                          item.status !== "cancelado" && (
                            <button
                              type="button"
                              disabled={completingId === item.id}
                              onClick={() => void handleComplete(item)}
                              className="inline-flex min-h-[44px] sm:min-h-[36px] flex-1 sm:flex-none items-center justify-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>
                                {completingId === item.id
                                  ? "..."
                                  : "Completar"}
                              </span>
                            </button>
                          )}

                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setDefaultDate(undefined);
                            setFormOpen(true);
                          }}
                          title="Editar"
                          aria-label="Editar"
                          className="flex min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] items-center justify-center rounded-xl border border-slate-200 sm:border-transparent text-slate-500 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setDeletingItem(item)}
                          title="Eliminar"
                          aria-label="Eliminar"
                          className="flex min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] items-center justify-center rounded-xl border border-slate-200 sm:border-transparent text-slate-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )
      ) : (
        /* Vista Calendario Mensual */
        <div className="rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-xs)] overflow-hidden">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-blue-50/40 px-4 py-3">
            <h2 className="text-sm font-semibold capitalize text-[#0F172A]">
              {currentMonthLabel}
            </h2>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={goPrevMonth}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goToday}
                className="h-9 rounded-lg border border-blue-200 bg-white px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={goNextMonth}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

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
              const isToday = cell.isoDate === todayIso;
              return (
                <div
                  key={cell.isoDate}
                  className={`min-h-[76px] sm:min-h-[112px] p-1 sm:p-1.5 flex flex-col gap-1 min-w-0 ${
                    cell.inCurrentMonth ? "bg-white" : "bg-slate-50/70"
                  }`}
                >
                  <div className="flex items-center justify-between gap-0.5">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] sm:text-xs font-medium ${
                        isToday
                          ? "bg-blue-600 text-white font-semibold"
                          : cell.inCurrentMonth
                          ? "text-[#0F172A]"
                          : "text-slate-400"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingItem(null);
                        setDefaultDate(cell.isoDate);
                        setFormOpen(true);
                      }}
                      title={`Agregar el ${cell.isoDate}`}
                      className="rounded p-0.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 min-w-0">
                    {cell.dayItems.map((ev) => {
                      const isDone = ev.status === "completado";
                      const accent = ev.entity_color || "#2563EB";
                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => {
                            setEditingItem(ev);
                            setDefaultDate(undefined);
                            setFormOpen(true);
                          }}
                          className={`flex w-full min-w-0 items-center gap-1 rounded-md px-1 sm:px-1.5 py-0.5 sm:py-1 text-left text-[10px] sm:text-[11px] transition-colors cursor-pointer ${
                            isDone
                              ? "bg-emerald-50 text-emerald-700 line-through"
                              : "bg-blue-50/70 text-[#0F172A] hover:bg-blue-100"
                          }`}
                          title={ev.title}
                        >
                          <span
                            className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full shrink-0"
                            style={{
                              backgroundColor: isDone ? "#047857" : accent,
                            }}
                          />
                          <span className="truncate font-medium">
                            {!ev.all_day ? `${formatTime(ev.start_at)} ` : ""}
                            {ev.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Drawer Crear / Editar Agenda */}
      <AgendaFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingItem(null);
          setDefaultDate(undefined);
        }}
        item={editingItem}
        entities={entities}
        defaultDate={defaultDate}
        onSaved={() => void fetchAgenda()}
      />

      <ConfirmDialog
        open={Boolean(deletingItem)}
        onClose={() => setDeletingItem(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar evento o trámite"
        description={`¿Seguro que deseas eliminar "${deletingItem?.title}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
