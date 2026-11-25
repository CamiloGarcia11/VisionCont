"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  ExternalLink,
  Landmark,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
} from "lucide-react";
import { MarkPaidModal } from "@/components/payments/mark-paid-modal";
import { PaymentFormModal } from "@/components/payments/payment-form-modal";
import {
  EntityBadge,
  PaymentStatusBadge,
  PriorityBadge,
} from "@/components/ui/badges";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { ListRowsSkeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import {
  PAYMENT_CATEGORIES,
  PAYMENT_STATUSES,
  getPaymentCategoryLabel,
  getPaymentStatusLabel,
  getRecurrenceLabel,
} from "@/lib/constants";
import { usePreferredCurrency } from "@/lib/currency-preference";
import {
  escapeCsvCell,
  formatCurrency,
  formatDateShort,
  formatTime,
  getTodayIsoDate,
} from "@/lib/format";
import type { ContactRow, EntityRow, PaymentRow } from "@/types/database";

export function PaymentsClient({
  initialPayments,
  entities,
  contacts,
  initialSearch = "",
}: {
  initialPayments: PaymentRow[];
  entities: EntityRow[];
  contacts: ContactRow[];
  initialSearch?: string;
}) {
  const { showToast } = useToast();
  const [preferredCurrency] = usePreferredCurrency();

  const [payments, setPayments] = useState<PaymentRow[]>(initialPayments);
  const [loading, setLoading] = useState(false);

  // Filtros
  const [statusFilter, setStatusFilter] = useState("todos");
  const [categoryFilter, setCategoryFilter] = useState("todos");
  const [entityFilter, setEntityFilter] = useState("todos");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchText, setSearchText] = useState(initialSearch);

  // Modales
  const [formOpen, setFormOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentRow | null>(null);
  const [payingPayment, setPayingPayment] = useState<PaymentRow | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<PaymentRow | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [bankPreviewPayment, setBankPreviewPayment] =
    useState<PaymentRow | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "todos") params.set("status", statusFilter);
      if (categoryFilter !== "todos") params.set("category", categoryFilter);
      if (entityFilter !== "todos") params.set("entityId", entityFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      if (searchText.trim()) params.set("search", searchText.trim());

      const res = await fetch(`/api/payments?${params.toString()}`);
      if (res.ok) {
        const json = (await res.json()) as { payments: PaymentRow[] };
        setPayments(json.payments);
      }
    } catch {
      showToast({ variant: "error", title: "Error cargando los pagos" });
    } finally {
      setLoading(false);
    }
  }, [
    statusFilter,
    categoryFilter,
    entityFilter,
    fromDate,
    toDate,
    searchText,
    showToast,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchPayments();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchPayments]);

  const filteredTotalAmount = useMemo(() => {
    return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  const handleOptimisticPay = useCallback((paymentId: string) => {
    setPayments((prev) =>
      prev.map((p) =>
        p.id === paymentId
          ? { ...p, status: "pagado", paid_at: new Date().toISOString() }
          : p
      )
    );
  }, []);

  const handleCopyBankInfo = async (text: string, label?: string | null) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast({
        variant: "success",
        title: "Datos bancarios copiados",
        description: label
          ? `Cuenta de ${label} lista en el portapapeles.`
          : "Copiado al portapapeles.",
      });
    } catch {
      showToast({
        variant: "error",
        title: "No se pudo copiar automáticamente",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingPayment) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/payments/${deletingPayment.id}`, {
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
        title: "Pago eliminado",
      });
      setDeletingPayment(null);
      await fetchPayments();
    } finally {
      setDeleting(false);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      "Concepto",
      "Entidad",
      "Proveedor",
      "Categoría",
      "Monto",
      "Moneda",
      "Fecha Vencimiento",
      "Hora",
      "Estado",
      "Prioridad",
      "Recurrente",
      "Frecuencia",
      "Comprobante URL",
      "Notas",
    ];

    const lines = [
      headers.map(escapeCsvCell).join(","),
      ...payments.map((p) =>
        [
          p.title,
          p.entity_name ?? "",
          p.contact_name ?? "",
          getPaymentCategoryLabel(p.category),
          p.amount,
          p.currency,
          p.due_date,
          p.due_time ?? "",
          getPaymentStatusLabel(p.status),
          p.priority,
          p.is_recurring ? "Sí" : "No",
          getRecurrenceLabel(p.recurrence_rule),
          p.receipt_url ?? "",
          p.description ?? "",
        ]
          .map(escapeCsvCell)
          .join(",")
      ),
    ];

    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pagos-gestion-gerencial-${getTodayIsoDate()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setStatusFilter("todos");
    setCategoryFilter("todos");
    setEntityFilter("todos");
    setFromDate("");
    setToDate("");
    setSearchText("");
  };

  const inputClass =
    "min-h-[40px] rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-sm text-[#0F172A] focus:border-blue-600 focus:bg-white focus:outline-none transition-all duration-200";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      {/* Cabecera */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0F172A]">
            Pagos y Obligaciones
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Control de facturas, impuestos, nómina, servicios y pagos
            recurrentes
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={payments.length === 0}
            className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-[#1E3A8A] hover:bg-blue-50 disabled:opacity-50 transition-all duration-200 cursor-pointer"
          >
            <Download className="h-4 w-4 text-blue-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setEditingPayment(null);
              setFormOpen(true);
            }}
            className="inline-flex min-h-[44px] flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-all duration-200 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Nuevo Pago</span>
          </button>
        </div>
      </div>

      {/* Barra de filtros */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-xs)] space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2 min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar concepto, notas o proveedor..."
              className={`${inputClass} w-full pl-9`}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className={inputClass}
            aria-label="Filtrar por estado"
          >
            <option value="todos">Todos los estados</option>
            {PAYMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={inputClass}
            aria-label="Filtrar por categoría"
          >
            <option value="todos">Todas las categorías</option>
            {PAYMENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
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

          <button
            type="button"
            onClick={clearFilters}
            className="min-h-[40px] rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
          >
            Limpiar filtros
          </button>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-500">
              Rango de vencimiento:
            </span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#0F172A] focus:border-blue-600 focus:outline-none"
              aria-label="Desde fecha"
            />
            <span>a</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-[#0F172A] focus:border-blue-600 focus:outline-none"
              aria-label="Hasta fecha"
            />
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span>
              Mostrando <strong className="text-[#0F172A]">{payments.length}</strong>{" "}
              registro(s)
            </span>
            <span>
              Suma total:{" "}
              <strong className="text-[#1E3A8A]">
                {formatCurrency(filteredTotalAmount, preferredCurrency)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Contenido: Skeleton, Empty State o Vista Dual (Tarjetas < md / Tabla md+) */}
      {loading && payments.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white">
          <ListRowsSkeleton rows={4} />
        </div>
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-5 w-5" />}
          title="No hay pagos para mostrar"
          description="Crea tu primer pago o ajusta los filtros aplicados para ver resultados."
          action={
            <button
              type="button"
              onClick={() => {
                setEditingPayment(null);
                setFormOpen(true);
              }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              <span>Registrar pago</span>
            </button>
          }
        />
      ) : (
        <>
          {/* Tarjetas apiladas en móvil (< md) */}
          <div className="space-y-3 md:hidden">
            {payments.map((p) => (
              <article
                key={p.id}
                className={`rounded-2xl border p-4 shadow-[var(--shadow-xs)] space-y-3 transition-all duration-200 ${
                  p.status === "vencido"
                    ? "border-red-200 bg-red-50/40"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <PaymentStatusBadge status={p.status} />
                      <EntityBadge
                        name={p.entity_name}
                        color={p.entity_color}
                      />
                    </div>
                    <h3 className="text-sm font-semibold text-[#0F172A] break-words">
                      {p.title}
                    </h3>
                  </div>

                  <p className="shrink-0 text-base font-bold text-[#1E3A8A]">
                    {formatCurrency(p.amount, p.currency)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                    {getPaymentCategoryLabel(p.category)}
                  </span>
                  <span>
                    Vence: <strong>{formatDateShort(p.due_date)}</strong> ·{" "}
                    {formatTime(p.due_time)}
                  </span>
                  {p.is_recurring && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 font-medium text-blue-700">
                      <Repeat className="h-3 w-3" />
                      {getRecurrenceLabel(p.recurrence_rule)}
                    </span>
                  )}
                  {(p.priority === "urgente" || p.priority === "alta") && (
                    <PriorityBadge priority={p.priority} />
                  )}
                </div>

                {(p.contact_name || p.receipt_url) && (
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {p.contact_name && (
                      <span className="truncate">
                        Proveedor: {p.contact_name}
                      </span>
                    )}
                    {p.contact_bank_info && (
                      <button
                        type="button"
                        onClick={() => setBankPreviewPayment(p)}
                        className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700"
                      >
                        <Landmark className="h-3.5 w-3.5" />
                        <span>Datos bancarios</span>
                      </button>
                    )}
                    {p.receipt_url && (
                      <a
                        href={p.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-600 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Comprobante</span>
                      </a>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-1.5">
                    {p.status !== "pagado" && p.status !== "cancelado" && (
                      <button
                        type="button"
                        onClick={() => setPayingPayment(p)}
                        className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Pagar</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPayment(p);
                        setFormOpen(true);
                      }}
                      aria-label="Editar pago"
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingPayment(p)}
                      aria-label="Eliminar pago"
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Tabla limpia de ancho completo en escritorio (md+) */}
          <div className="hidden md:block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--shadow-xs)]">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-blue-50/50 text-xs font-semibold uppercase tracking-wider text-[#1E3A8A]">
                    <th className="px-4 py-3.5">Concepto</th>
                    <th className="px-4 py-3.5">Entidad</th>
                    <th className="px-4 py-3.5">Categoría</th>
                    <th className="px-4 py-3.5">Monto</th>
                    <th className="px-4 py-3.5">Vencimiento</th>
                    <th className="px-4 py-3.5">Estado</th>
                    <th className="px-4 py-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className={`transition-colors hover:bg-blue-50/40 ${
                        p.status === "vencido" ? "bg-red-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 align-top max-w-[280px]">
                        <div className="space-y-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-semibold text-[#0F172A] break-words">
                              {p.title}
                            </span>
                            {p.is_recurring && (
                              <span
                                title={`Recurrente: ${getRecurrenceLabel(
                                  p.recurrence_rule
                                )}`}
                                className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700"
                              >
                                <Repeat className="h-2.5 w-2.5" />
                                {getRecurrenceLabel(p.recurrence_rule)}
                              </span>
                            )}
                          </div>
                          {p.contact_name && (
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="truncate">
                                Proveedor: {p.contact_name}
                              </span>
                              {p.contact_bank_info && (
                                <button
                                  type="button"
                                  onClick={() => setBankPreviewPayment(p)}
                                  className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50/80 px-1.5 py-0.5 text-[11px] font-medium text-blue-700 hover:bg-blue-100 cursor-pointer"
                                >
                                  <Landmark className="h-3 w-3" />
                                  <span>Datos bancarios</span>
                                </button>
                              )}
                            </div>
                          )}
                          {p.receipt_url && (
                            <a
                              href={p.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Ver comprobante</span>
                            </a>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <EntityBadge
                          name={p.entity_name}
                          color={p.entity_color}
                        />
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <span className="text-xs font-medium text-slate-600">
                          {getPaymentCategoryLabel(p.category)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <span className="font-bold text-[#1E3A8A]">
                          {formatCurrency(p.amount, p.currency)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <p className="text-xs font-semibold text-[#0F172A]">
                          {formatDateShort(p.due_date)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatTime(p.due_time)}
                        </p>
                      </td>

                      <td className="px-4 py-3.5 align-top">
                        <div className="flex flex-col items-start gap-1">
                          <PaymentStatusBadge status={p.status} />
                          {p.priority === "urgente" ||
                          p.priority === "alta" ? (
                            <PriorityBadge priority={p.priority} />
                          ) : null}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 align-top text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {p.status !== "pagado" &&
                            p.status !== "cancelado" && (
                              <button
                                type="button"
                                onClick={() => setPayingPayment(p)}
                                title="Marcar como pagado"
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Pagar</span>
                              </button>
                            )}

                          <button
                            type="button"
                            onClick={() => {
                              setEditingPayment(p);
                              setFormOpen(true);
                            }}
                            title="Editar pago"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-blue-50 hover:text-blue-700 cursor-pointer"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeletingPayment(p)}
                            title="Eliminar pago"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Drawer Crear / Editar Pago */}
      <PaymentFormModal
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingPayment(null);
        }}
        payment={editingPayment}
        entities={entities}
        contacts={contacts}
        onSaved={() => void fetchPayments()}
      />

      {/* Modal Marcar Pagado */}
      <MarkPaidModal
        open={Boolean(payingPayment)}
        onClose={() => setPayingPayment(null)}
        payment={payingPayment}
        onOptimisticPay={handleOptimisticPay}
        onCompleted={() => void fetchPayments()}
      />

      {/* Modal Datos Bancarios Rápidos */}
      <Modal
        open={Boolean(bankPreviewPayment)}
        onClose={() => setBankPreviewPayment(null)}
        title={`Datos bancarios · ${bankPreviewPayment?.contact_name ?? ""}`}
        size="sm"
      >
        {bankPreviewPayment && (
          <div className="space-y-3">
            {bankPreviewPayment.contact_tax_id && (
              <p className="text-xs text-slate-600">
                NIT / Cédula:{" "}
                <strong className="text-[#0F172A]">
                  {bankPreviewPayment.contact_tax_id}
                </strong>
              </p>
            )}
            <pre className="whitespace-pre-wrap break-words rounded-xl border border-blue-100 bg-blue-50/50 p-3 font-sans text-sm text-[#0F172A]">
              {bankPreviewPayment.contact_bank_info}
            </pre>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setBankPreviewPayment(null)}
                className="min-h-[40px] rounded-xl border border-slate-200 px-3.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() =>
                  void handleCopyBankInfo(
                    bankPreviewPayment.contact_bank_info || "",
                    bankPreviewPayment.contact_name
                  )
                }
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
              >
                <Copy className="h-4 w-4" />
                <span>Copiar datos</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(deletingPayment)}
        onClose={() => setDeletingPayment(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar pago"
        description={`¿Seguro que deseas eliminar "${deletingPayment?.title}"? Esta acción no se puede deshacer.`}
      />
    </div>
  );
}
