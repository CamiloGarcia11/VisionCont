"use client";

import React, { useState } from "react";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { getRecurrenceLabel } from "@/lib/constants";
import { formatCurrency, formatDateShort, getTodayIsoDate } from "@/lib/format";
import type { PaymentRow } from "@/types/database";

export function MarkPaidModal({
  open,
  onClose,
  payment,
  onCompleted,
  onOptimisticPay,
}: {
  open: boolean;
  onClose: () => void;
  payment: PaymentRow | null;
  onCompleted: () => void;
  onOptimisticPay?: (paymentId: string) => void;
}) {
  if (!open || !payment) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirmar pago realizado"
      description="Se marcará como pagado conservando el registro en tu historial."
      size="sm"
    >
      <MarkPaidInner
        key={payment.id}
        payment={payment}
        onClose={onClose}
        onCompleted={onCompleted}
        onOptimisticPay={onOptimisticPay}
      />
    </Modal>
  );
}

function MarkPaidInner({
  payment,
  onClose,
  onCompleted,
  onOptimisticPay,
}: {
  payment: PaymentRow;
  onClose: () => void;
  onCompleted: () => void;
  onOptimisticPay?: (paymentId: string) => void;
}) {
  const { showToast } = useToast();

  const [receiptUrl, setReceiptUrl] = useState(payment.receipt_url ?? "");
  const [paidDate, setPaidDate] = useState(getTodayIsoDate());
  const [createNext, setCreateNext] = useState(
    Boolean(payment.is_recurring && payment.recurrence_rule)
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);
    onOptimisticPay?.(payment.id);

    const paidAtIso = `${paidDate}T12:00:00-05:00`;

    try {
      const res = await fetch(`/api/payments/${payment.id}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receipt_url: receiptUrl.trim() || null,
          paid_at: paidAtIso,
          create_next_recurrence:
            Boolean(payment.is_recurring && payment.recurrence_rule) &&
            createNext,
        }),
      });

      const json = (await res.json()) as {
        payment?: PaymentRow;
        nextPayment?: PaymentRow | null;
        error?: string;
      };

      if (!res.ok) {
        setErrorMsg(json.error || "No se pudo registrar el pago");
        return;
      }

      const nextInfo = json.nextPayment
        ? ` Se programó el siguiente periodo para el ${formatDateShort(
            json.nextPayment.due_date
          )}.`
        : "";

      showToast({
        variant: "success",
        title: `Pago marcado como pagado.${nextInfo}`,
      });

      onCompleted();
      onClose();
    } catch {
      setErrorMsg("Error de conexión al registrar el pago");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-app)] p-3">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {payment.title}
        </p>
        <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
          {formatCurrency(payment.amount, payment.currency)} · Vence{" "}
          {formatDateShort(payment.due_date)}
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-[var(--radius-md)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] px-3 py-2 text-xs text-[var(--status-danger-text)]">
          {errorMsg}
        </div>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          Fecha de pago
        </label>
        <input
          type="date"
          required
          value={paidDate}
          onChange={(e) => setPaidDate(e.target.value)}
          className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">
          Enlace del comprobante (opcional)
        </label>
        <input
          type="url"
          value={receiptUrl}
          onChange={(e) => setReceiptUrl(e.target.value)}
          placeholder="https://drive.google.com/..."
          className="w-full rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none"
        />
      </div>

      {payment.is_recurring && payment.recurrence_rule && (
        <div className="rounded-[var(--radius-md)] border border-[var(--accent-soft-border)] bg-[var(--accent-soft)] p-3">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={createNext}
              onChange={(e) => setCreateNext(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded accent-[var(--accent-primary)]"
            />
            <div className="text-xs">
              <span className="flex items-center gap-1 font-semibold text-[var(--accent-text)]">
                <CalendarClock className="h-3.5 w-3.5" />
                Generar automáticamente el siguiente periodo (
                {getRecurrenceLabel(payment.recurrence_rule)})
              </span>
              <span className="mt-0.5 block text-[var(--text-secondary)]">
                Creará el próximo pago pendiente con el mismo monto y lo
                agendará en Google Calendar.
              </span>
            </div>
          </label>
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          disabled={submitting}
          className="rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-surface-muted)] disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--status-success-text)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          <CheckCircle2 className="h-4 w-4" />
          <span>{submitting ? "Registrando..." : "Marcar pagado"}</span>
        </button>
      </div>
    </form>
  );
}
