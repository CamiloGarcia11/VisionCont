"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  Copy,
  CreditCard,
  Pencil,
  Plus,
  StickyNote,
  Trash2,
} from "lucide-react";
import { AgendaFormModal } from "@/components/agenda/agenda-form-modal";
import { PaymentFormModal } from "@/components/payments/payment-form-modal";
import {
  AgendaStatusBadge,
  PaymentStatusBadge,
} from "@/components/ui/badges";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  ENTITY_COLOR_PRESETS,
  ENTITY_TYPES,
  getEntityTypeLabel,
} from "@/lib/constants";
import { usePreferredCurrency } from "@/lib/currency-preference";
import { formatCurrency, formatDateShort } from "@/lib/format";
import type {
  AgendaItemRow,
  ContactRow,
  EntityRow,
  EntityType,
  PaymentRow,
} from "@/types/database";

interface EntityDetailPayload {
  entity: EntityRow;
  payments: PaymentRow[];
  agenda: AgendaItemRow[];
}

export function EntitiesClient({
  initialEntities,
  contacts,
  initialSelectedId,
}: {
  initialEntities: EntityRow[];
  contacts: ContactRow[];
  initialSelectedId?: string;
}) {
  const { showToast } = useToast();
  const [preferredCurrency] = usePreferredCurrency();

  const [entities, setEntities] = useState<EntityRow[]>(initialEntities);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialSelectedId || initialEntities[0]?.id || null
  );
  const [detail, setDetail] = useState<EntityDetailPayload | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal CRUD Entidad
  const [formOpen, setFormOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<EntityRow | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<EntityType>("empresa");
  const [color, setColor] = useState("#1D4ED8");
  const [quickNotes, setQuickNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [deletingEntity, setDeletingEntity] = useState<EntityRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [quickAgendaOpen, setQuickAgendaOpen] = useState(false);

  const fetchEntities = useCallback(async () => {
    const res = await fetch("/api/entities");
    if (res.ok) {
      const json = (await res.json()) as { entities: EntityRow[] };
      setEntities(json.entities);
    }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/entities/${id}`);
      if (res.ok) {
        const json = (await res.json()) as EntityDetailPayload;
        setDetail(json);
      } else {
        setDetail(null);
      }
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/entities/${selectedId}`);
        if (!cancelled && res.ok) {
          const json = (await res.json()) as EntityDetailPayload;
          setDetail(json);
        }
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const openCreateModal = () => {
    setEditingEntity(null);
    setName("");
    setType("jefe");
    setColor("#1D4ED8");
    setQuickNotes("");
    setFormError(null);
    setFormOpen(true);
  };

  const openEditModal = (ent: EntityRow) => {
    setEditingEntity(ent);
    setName(ent.name);
    setType(ent.type);
    setColor(ent.color || "#1D4ED8");
    setQuickNotes(ent.quick_notes ?? "");
    setFormError(null);
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const res = await fetch(
        editingEntity ? `/api/entities/${editingEntity.id}` : "/api/entities",
        {
          method: editingEntity ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            type,
            color,
            quick_notes: quickNotes || null,
          }),
        }
      );

      const json = (await res.json()) as {
        entity?: EntityRow;
        error?: string;
      };
      if (!res.ok || !json.entity) {
        setFormError(json.error || "Error guardando la entidad");
        return;
      }

      showToast({
        variant: "success",
        title: editingEntity ? "Perfil actualizado" : "Perfil creado",
      });

      setFormOpen(false);
      await fetchEntities();
      setSelectedId(json.entity.id);
      await fetchDetail(json.entity.id);
    } catch {
      setFormError("Error de conexión al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingEntity) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/entities/${deletingEntity.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        showToast({ variant: "error", title: "No se pudo eliminar" });
        return;
      }
      showToast({ variant: "success", title: "Entidad eliminada" });
      const wasSelected = selectedId === deletingEntity.id;
      setDeletingEntity(null);
      await fetchEntities();
      if (wasSelected) {
        setSelectedId(null);
        setDetail(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyNotes = async (notes: string) => {
    try {
      await navigator.clipboard.writeText(notes);
      showToast({
        variant: "success",
        title: "Notas rápidas copiadas",
      });
    } catch {
      showToast({ variant: "error", title: "No se pudo copiar" });
    }
  };

  const pendingPayments =
    detail?.payments.filter(
      (p) => p.status !== "pagado" && p.status !== "cancelado"
    ) ?? [];
  const pendingTotal = pendingPayments.reduce(
    (sum, p) => sum + Number(p.amount || 0),
    0
  );
  const upcomingAgenda =
    detail?.agenda.filter(
      (a) => a.status !== "completado" && a.status !== "cancelado"
    ) ?? [];

  const inputClass =
    "min-h-[40px] w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-[#0F172A] focus:border-blue-600 focus:bg-white focus:outline-none transition-all duration-200";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#0F172A]">
            Jefes y Empresa
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Perfiles responsables con notas rápidas (NIT, cédulas, cuentas y
            direcciones frecuentes)
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex min-h-[44px] w-full sm:w-auto items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition-all duration-200 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Nuevo Perfil</span>
        </button>
      </div>

      {entities.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="Aún no hay perfiles creados"
          description="Crea el perfil de la empresa principal, cada jefe o área para organizar pagos, agenda y notas rápidas."
          action={
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-3.5 py-2 text-sm font-medium text-white"
            >
              <Plus className="h-4 w-4" />
              <span>Crear primer perfil</span>
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Lista de perfiles */}
          <div className="lg:col-span-4 space-y-2.5">
            {entities.map((ent) => {
              const isSelected = selectedId === ent.id;
              return (
                <div
                  key={ent.id}
                  onClick={() => {
                    setLoadingDetail(true);
                    setSelectedId(ent.id);
                  }}
                  className={`group rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? "border-blue-600 bg-blue-50/40 shadow-sm"
                      : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-3.5 w-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: ent.color || "#1D4ED8" }}
                      />
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
                          {ent.name}
                        </h3>
                        <span className="text-xs text-[var(--text-muted)]">
                          {getEntityTypeLabel(ent.type)}
                        </span>
                      </div>
                    </div>

                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openEditModal(ent)}
                        className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-surface-muted)] hover:text-[var(--text-primary)]"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingEntity(ent)}
                        className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--status-danger-bg)] hover:text-[var(--status-danger-text)]"
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {ent.quick_notes && (
                    <p className="mt-2 line-clamp-2 text-xs text-[var(--text-secondary)]">
                      {ent.quick_notes}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Panel consolidado */}
          <div className="lg:col-span-8">
            {!selectedId || !detail ? (
              <EmptyState
                icon={<Building2 className="h-5 w-5" />}
                title={
                  loadingDetail
                    ? "Cargando panel consolidado..."
                    : "Selecciona un jefe o empresa"
                }
                description="Haz clic en un perfil de la izquierda para consultar sus pagos pendientes, agenda y notas rápidas."
              />
            ) : (
              <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-xs)] min-w-0">
                {/* Encabezado del perfil */}
                <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className="h-4 w-4 rounded-full shrink-0"
                      style={{
                        backgroundColor: detail.entity.color || "#2563EB",
                      }}
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-semibold text-[#0F172A]">
                        {detail.entity.name}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {getEntityTypeLabel(detail.entity.type)} ·{" "}
                        {pendingPayments.length} pago(s) pendientes (
                        {formatCurrency(pendingTotal, preferredCurrency)})
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setQuickPaymentOpen(true)}
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Pago</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setQuickAgendaOpen(true)}
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Evento</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(detail.entity)}
                      className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      <span>Editar perfil</span>
                    </button>
                  </div>
                </div>

                {/* Notas Rápidas */}
                <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-app)] p-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                      <StickyNote className="h-3.5 w-3.5 text-[var(--accent-primary)]" />
                      Notas rápidas (NIT, Cédula, Cuentas, Direcciones)
                    </span>
                    {detail.entity.quick_notes && (
                      <button
                        type="button"
                        onClick={() =>
                          void handleCopyNotes(detail.entity.quick_notes || "")
                        }
                        className="inline-flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
                      >
                        <Copy className="h-3 w-3" />
                        <span>Copiar</span>
                      </button>
                    )}
                  </div>
                  {detail.entity.quick_notes ? (
                    <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-[var(--text-primary)]">
                      {detail.entity.quick_notes}
                    </pre>
                  ) : (
                    <p className="mt-2 text-xs text-[var(--text-muted)]">
                      Sin notas rápidas registradas. Haz clic en &ldquo;Editar
                      perfil&rdquo; para guardar NIT, cédulas o cuentas
                      frecuentes.
                    </p>
                  )}
                </div>

                {/* Pagos Pendientes */}
                <div>
                  <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Pagos pendientes ({pendingPayments.length})</span>
                  </h3>
                  {pendingPayments.length === 0 ? (
                    <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] p-3 text-xs text-[var(--text-muted)]">
                      No hay pagos pendientes para esta entidad.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                      {pendingPayments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--text-primary)]">
                              {p.title}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              Vence {formatDateShort(p.due_date)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2.5 shrink-0">
                            <PaymentStatusBadge status={p.status} />
                            <span className="font-semibold text-[var(--text-primary)]">
                              {formatCurrency(p.amount, p.currency)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Agenda próxima */}
                <div>
                  <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span>Agenda próxima ({upcomingAgenda.length})</span>
                  </h3>
                  {upcomingAgenda.length === 0 ? (
                    <p className="rounded-[var(--radius-md)] border border-dashed border-[var(--border-subtle)] p-3 text-xs text-[var(--text-muted)]">
                      Sin eventos o trámites próximos para esta entidad.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-md)] border border-[var(--border-subtle)]">
                      {upcomingAgenda.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-[var(--text-primary)]">
                              {a.title}
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              {formatDateShort(a.start_at)}
                              {a.location ? ` · ${a.location}` : ""}
                            </p>
                          </div>
                          <AgendaStatusBadge status={a.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Drawer Crear / Editar Entidad */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        variant="drawer"
        title={editingEntity ? "Editar perfil" : "Nuevo perfil (Jefe / Empresa)"}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="rounded-[var(--radius-md)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 text-xs text-[var(--status-danger-text)]">
              {formError}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Nombre *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Constructora Horizonte SAS / Dr. Carlos Mendoza"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Tipo *
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as EntityType)}
                className={inputClass}
              >
                {ENTITY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                Color identificador
              </label>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {ENTITY_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setColor(preset)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform cursor-pointer ${
                      color.toLowerCase() === preset.toLowerCase()
                        ? "scale-110 border-slate-900"
                        : "border-transparent"
                    }`}
                    style={{ backgroundColor: preset }}
                    aria-label={`Color ${preset}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
              Notas rápidas (NIT, cédula, cuentas frecuentes, dirección...)
            </label>
            <textarea
              rows={5}
              value={quickNotes}
              onChange={(e) => setQuickNotes(e.target.value)}
              placeholder={`NIT: 900.123.456-7\nDirección: Cra 15 # 93-40\nCuenta frecuente Bancolombia Ahorros: 123-456789-00`}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              disabled={saving}
              className="rounded-[var(--radius-md)] border border-[var(--border-strong)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>

      <PaymentFormModal
        open={quickPaymentOpen}
        onClose={() => setQuickPaymentOpen(false)}
        entities={entities}
        contacts={contacts}
        defaultEntityId={selectedId ?? undefined}
        onSaved={() => {
          if (selectedId) void fetchDetail(selectedId);
        }}
      />

      <AgendaFormModal
        open={quickAgendaOpen}
        onClose={() => setQuickAgendaOpen(false)}
        entities={entities}
        defaultEntityId={selectedId ?? undefined}
        onSaved={() => {
          if (selectedId) void fetchDetail(selectedId);
        }}
      />

      <ConfirmDialog
        open={Boolean(deletingEntity)}
        onClose={() => setDeletingEntity(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Eliminar perfil"
        description={`¿Deseas eliminar "${deletingEntity?.name}"? Los pagos o eventos asociados quedarán sin entidad asignada, pero no se borrarán.`}
      />
    </div>
  );
}
