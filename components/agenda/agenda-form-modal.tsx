"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  AGENDA_ITEM_TYPES,
  AGENDA_STATUSES,
  PRIORITY_LEVELS,
} from "@/lib/constants";
import {
  getTodayIsoDate,
  toBogotaDateTimeLocal,
  toIsoDateString,
} from "@/lib/format";
import type {
  AgendaItemRow,
  EntityRow,
} from "@/types/database";

export function AgendaFormModal(props: {
  open: boolean;
  onClose: () => void;
  item?: AgendaItemRow | null;
  entities: EntityRow[];
  defaultEntityId?: string;
  defaultDate?: string;
  onSaved: (item: AgendaItemRow) => void;
}) {
  if (!props.open) return null;

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      variant="drawer"
      title={
        props.item
          ? "Editar evento / anotación"
          : "Nueva fecha / anotación"
      }
      description="Registra solo lo necesario. Si deseas agregar más detalles, escríbelos en observaciones."
      size="md"
    >
      <AgendaFormInner
        key={
          props.item?.id ??
          `new-${props.defaultDate ?? "today"}-${props.defaultEntityId ?? "none"}`
        }
        onClose={props.onClose}
        item={props.item}
        entities={props.entities}
        defaultEntityId={props.defaultEntityId}
        defaultDate={props.defaultDate}
        onSaved={props.onSaved}
      />
    </Modal>
  );
}

function AgendaFormInner({
  onClose,
  item,
  entities,
  defaultEntityId,
  defaultDate,
  onSaved,
}: {
  onClose: () => void;
  item?: AgendaItemRow | null;
  entities: EntityRow[];
  defaultEntityId?: string;
  defaultDate?: string;
  onSaved: (item: AgendaItemRow) => void;
}) {
  const { showToast } = useToast();
  const baseDate = defaultDate || getTodayIsoDate();

  const [title, setTitle] = useState(item?.title ?? "");
  const [itemType, setItemType] = useState<string>(
    item?.item_type ?? "tramite"
  );
  const [entityId, setEntityId] = useState(
    item?.entity_id ??
      (defaultEntityId && defaultEntityId !== "todos" ? defaultEntityId : "")
  );
  const [allDay, setAllDay] = useState(item ? Boolean(item.all_day) : true);
  const [startDate, setStartDate] = useState(
    item ? toIsoDateString(item.start_at) : baseDate
  );
  const [startDateTime, setStartDateTime] = useState(
    item ? toBogotaDateTimeLocal(item.start_at) : `${baseDate}T09:00`
  );
  const [endDate, setEndDate] = useState(
    item?.end_at ? toIsoDateString(item.end_at) : ""
  );
  const [endDateTime, setEndDateTime] = useState(
    item
      ? item.end_at
        ? toBogotaDateTimeLocal(item.end_at)
        : ""
      : `${baseDate}T10:00`
  );
  const [location, setLocation] = useState(item?.location ?? "");
  const [status, setStatus] = useState<string>(item?.status ?? "pendiente");
  const [priority, setPriority] = useState<string>(item?.priority ?? "media");
  const [description, setDescription] = useState(item?.description ?? "");
  const [showOptional, setShowOptional] = useState(Boolean(item));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);

    const payload = {
      title,
      item_type: itemType,
      entity_id: entityId || null,
      all_day: allDay,
      start_at: allDay ? startDate : startDateTime,
      end_at: allDay ? endDate || null : endDateTime || null,
      location: location || null,
      status,
      priority,
      reminder_minutes: item?.reminder_minutes?.length
        ? item.reminder_minutes
        : [1440, 60],
      description: description || null,
    };

    try {
      const res = await fetch(
        item ? `/api/agenda/${item.id}` : "/api/agenda",
        {
          method: item ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = (await res.json()) as {
        item?: AgendaItemRow;
        error?: string;
      };

      if (!res.ok || !json.item) {
        setErrorMsg(json.error || "No se pudo guardar el evento");
        return;
      }

      showToast({
        variant: "success",
        title: item
          ? "Evento / anotación actualizada"
          : "Guardado en el calendario",
      });

      onSaved(json.item);
      onClose();
    } catch {
      setErrorMsg("Error de conexión al guardar en agenda");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="rounded-[var(--radius-md)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 text-xs text-[var(--status-danger-text)]">
          {errorMsg}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          Título *
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Renovación Cámara de Comercio, Junta Directiva..."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
            Tipo *
          </label>
          <select
            value={itemType}
            onChange={(e) => setItemType(e.target.value)}
            className={inputClass}
          >
            {AGENDA_ITEM_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
            {allDay ? "Fecha *" : "Fecha y hora de inicio *"}
          </label>
          {allDay ? (
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={inputClass}
            />
          ) : (
            <input
              type="datetime-local"
              required
              value={startDateTime}
              onChange={(e) => setStartDateTime(e.target.value)}
              className={inputClass}
            />
          )}
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          Observaciones (opcional)
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Documentos, ubicación, notas o comentarios..."
          className={inputClass}
        />
      </div>

      <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-app)]">
        <button
          type="button"
          onClick={() => setShowOptional((prev) => !prev)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-50/70 transition-colors cursor-pointer"
        >
          <span>Opciones adicionales (opcional)</span>
          {showOptional ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {showOptional && (
          <div className="space-y-3 border-t border-[var(--border-subtle)] p-3">
            <div className="flex items-center gap-2">
              <input
                id="agenda-with-time"
                type="checkbox"
                checked={!allDay}
                onChange={(e) => setAllDay(!e.target.checked)}
                className="h-4 w-4 rounded accent-[var(--accent-primary)]"
              />
              <label
                htmlFor="agenda-with-time"
                className="text-xs font-medium text-[var(--text-primary)] cursor-pointer"
              >
                Incluir hora específica
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  {allDay ? "Fecha fin (opcional)" : "Fecha y hora fin (opcional)"}
                </label>
                {allDay ? (
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className={inputClass}
                  />
                ) : (
                  <input
                    type="datetime-local"
                    value={endDateTime}
                    onChange={(e) => setEndDateTime(e.target.value)}
                    className={inputClass}
                  />
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Empresa / Jefe asociado
                </label>
                <select
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Sin asignar</option>
                  {entities.map((ent) => (
                    <option key={ent.id} value={ent.id}>
                      {ent.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Ubicación / Enlace
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Oficina, Notaría..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Estado
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className={inputClass}
                >
                  {AGENDA_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Prioridad
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className={inputClass}
                >
                  {PRIORITY_LEVELS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-[var(--border-subtle)] pt-3">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-[var(--radius-md)] bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-primary-hover)] disabled:opacity-50"
        >
          {saving ? "Guardando..." : item ? "Guardar cambios" : "Agendar"}
        </button>
      </div>
    </form>
  );
}
