"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  CURRENCIES,
  PAYMENT_CATEGORIES,
  PAYMENT_STATUSES,
  PRIORITY_LEVELS,
  RECURRENCE_RULES,
} from "@/lib/constants";
import { usePreferredCurrency } from "@/lib/currency-preference";
import { getTodayIsoDate } from "@/lib/format";
import type {
  ContactRow,
  EntityRow,
  PaymentRow,
} from "@/types/database";

export function PaymentFormModal(props: {
  open: boolean;
  onClose: () => void;
  payment?: PaymentRow | null;
  entities: EntityRow[];
  contacts: ContactRow[];
  defaultEntityId?: string;
  defaultDate?: string;
  onSaved: (payment: PaymentRow) => void;
}) {
  if (!props.open) return null;

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      variant="drawer"
      title={
        props.payment
          ? "Editar pago / obligación"
          : "Nuevo pago / obligación"
      }
      description="Registra solo lo esencial. Si necesitas agregar más detalles, usa las observaciones."
      size="md"
    >
      <PaymentFormInner
        key={
          props.payment?.id ??
          `new-${props.defaultDate ?? "today"}-${props.defaultEntityId ?? "none"}`
        }
        onClose={props.onClose}
        payment={props.payment}
        entities={props.entities}
        contacts={props.contacts}
        defaultEntityId={props.defaultEntityId}
        defaultDate={props.defaultDate}
        onSaved={props.onSaved}
      />
    </Modal>
  );
}

function PaymentFormInner({
  onClose,
  payment,
  entities,
  contacts,
  defaultEntityId,
  defaultDate,
  onSaved,
}: {
  onClose: () => void;
  payment?: PaymentRow | null;
  entities: EntityRow[];
  contacts: ContactRow[];
  defaultEntityId?: string;
  defaultDate?: string;
  onSaved: (payment: PaymentRow) => void;
}) {
  const { showToast } = useToast();
  const [preferredCurrency] = usePreferredCurrency();

  const [title, setTitle] = useState(payment?.title ?? "");
  const [entityId, setEntityId] = useState(
    payment?.entity_id ??
      (defaultEntityId && defaultEntityId !== "todos" ? defaultEntityId : "")
  );
  const [contactId, setContactId] = useState(payment?.contact_id ?? "");
  const [category, setCategory] = useState<string>(
    payment?.category ?? "proveedores"
  );
  const [amount, setAmount] = useState(
    payment ? String(payment.amount) : ""
  );
  const [currency, setCurrency] = useState(
    payment?.currency || preferredCurrency
  );
  const [dueDate, setDueDate] = useState(
    payment ? payment.due_date.slice(0, 10) : defaultDate || getTodayIsoDate()
  );
  const [dueTime, setDueTime] = useState(
    payment ? (payment.due_time || "09:00:00").slice(0, 5) : "09:00"
  );
  const [status, setStatus] = useState<string>(payment?.status ?? "pendiente");
  const [priority, setPriority] = useState<string>(
    payment?.priority ?? "media"
  );
  const [isRecurring, setIsRecurring] = useState(
    Boolean(payment?.is_recurring)
  );
  const [recurrenceRule, setRecurrenceRule] = useState<string>(
    payment?.recurrence_rule ?? "mensual"
  );
  const [description, setDescription] = useState(payment?.description ?? "");
  const [receiptUrl, setReceiptUrl] = useState(payment?.receipt_url ?? "");
  const [showOptional, setShowOptional] = useState(Boolean(payment));
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);

    const payload = {
      title,
      entity_id: entityId || null,
      contact_id: contactId || null,
      category,
      amount: Number(amount || 0),
      currency,
      due_date: dueDate,
      due_time: dueTime || "09:00",
      status,
      priority,
      is_recurring: isRecurring,
      recurrence_rule: isRecurring ? recurrenceRule : null,
      reminder_days: payment?.reminder_days?.length
        ? payment.reminder_days
        : [3, 1, 0],
      description: description || null,
      receipt_url: receiptUrl || null,
    };

    try {
      const res = await fetch(
        payment ? `/api/payments/${payment.id}` : "/api/payments",
        {
          method: payment ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const json = (await res.json()) as {
        payment?: PaymentRow;
        error?: string;
      };

      if (!res.ok || !json.payment) {
        setErrorMsg(json.error || "No se pudo guardar el pago");
        return;
      }

      showToast({
        variant: "success",
        title: payment ? "Pago actualizado" : "Pago guardado en el calendario",
      });

      onSaved(json.payment);
      onClose();
    } catch {
      setErrorMsg("Error de conexión al guardar el pago");
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
          Concepto / Título *
        </label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej. Retención en la fuente, Arriendo oficina..."
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
            Monto *
          </label>
          <input
            type="number"
            min="0"
            step="any"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="1500000"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
            Fecha límite *
          </label>
          <input
            type="date"
            required
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          Categoría *
        </label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className={inputClass}
        >
          {PAYMENT_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          Observaciones (opcional)
        </label>
        <textarea
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Número de factura, referencia, notas adicionales..."
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Empresa / Jefe responsable
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

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Proveedor / Beneficiario
                </label>
                <select
                  value={contactId}
                  onChange={(e) => setContactId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Sin proveedor asociado</option>
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Moneda
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={inputClass}
                >
                  {CURRENCIES.map((cur) => (
                    <option key={cur.value} value={cur.value}>
                      {cur.value}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Hora
                </label>
                <input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
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
                  {PAYMENT_STATUSES.map((s) => (
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

            <div className="space-y-2 pt-1">
              <label className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  className="h-4 w-4 rounded border-[var(--border-strong)] accent-[var(--accent-primary)]"
                />
                <span>Pago recurrente (autogenerar siguiente periodo)</span>
              </label>

              {isRecurring && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                    Frecuencia
                  </label>
                  <select
                    value={recurrenceRule}
                    onChange={(e) => setRecurrenceRule(e.target.value)}
                    className={inputClass}
                  >
                    {RECURRENCE_RULES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {(payment || status === "pagado") && (
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
                  Enlace del comprobante (opcional)
                </label>
                <input
                  type="url"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>
            )}
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
          {saving
            ? "Guardando..."
            : payment
            ? "Guardar cambios"
            : "Crear pago"}
        </button>
      </div>
    </form>
  );
}
