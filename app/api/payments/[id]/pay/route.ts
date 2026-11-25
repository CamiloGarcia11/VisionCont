import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import {
  computeNextDueDate,
  getPaymentById,
  normalizePaymentRow,
} from "@/lib/data-queries";
import { getSql, logActivity } from "@/lib/db";
import {
  formatZodError,
  isValidUuid,
  markPaymentPaidSchema,
} from "@/lib/validators";
import type { PaymentRow } from "@/types/database";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "ID de pago inválido" }, { status: 400 });
  }

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const parsed = markPaymentPaidSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const sql = getSql();

  try {
    const existingRows = (await sql`
      SELECT * FROM payments WHERE id = ${id} AND user_id = ${ctx.userId} LIMIT 1
    `) as Record<string, unknown>[];

    if (!existingRows[0]) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    const current = normalizePaymentRow(existingRows[0]);
    const paidAtIso = data.paid_at
      ? new Date(data.paid_at).toISOString()
      : new Date().toISOString();

    await sql`
      UPDATE payments
      SET
        status = 'pagado',
        receipt_url = ${data.receipt_url !== undefined ? data.receipt_url : current.receipt_url},
        paid_at = ${paidAtIso},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${ctx.userId}
    `;

    await logActivity({
      userId: ctx.userId,
      action: "payment_paid",
      targetType: "payment",
      targetId: id,
      summary: `Marcó como pagado "${current.title}"`,
    });

    let nextPayment: PaymentRow | null = null;

    if (
      data.create_next_recurrence &&
      current.is_recurring &&
      current.recurrence_rule
    ) {
      const nextDueDate = computeNextDueDate(
        current.due_date,
        current.recurrence_rule
      );
      const dueTimeNormalized =
        current.due_time && current.due_time.length === 5
          ? `${current.due_time}:00`
          : current.due_time ?? "09:00:00";

      const insertedNext = (await sql`
        INSERT INTO payments (
          user_id,
          entity_id,
          contact_id,
          title,
          description,
          category,
          amount,
          currency,
          due_date,
          due_time,
          status,
          priority,
          is_recurring,
          recurrence_rule,
          reminder_days
        ) VALUES (
          ${ctx.userId},
          ${current.entity_id},
          ${current.contact_id},
          ${current.title},
          ${current.description},
          ${current.category},
          ${current.amount},
          ${current.currency},
          ${nextDueDate}::date,
          ${dueTimeNormalized}::time,
          'pendiente',
          ${current.priority},
          true,
          ${current.recurrence_rule},
          ${current.reminder_days}
        )
        RETURNING id
      `) as { id: string }[];

      const nextId = insertedNext[0]?.id;
      if (nextId) {
        await logActivity({
          userId: ctx.userId,
          action: "payment_recurrence_created",
          targetType: "payment",
          targetId: nextId,
          summary: `Generó siguiente periodo recurrente de "${current.title}" para ${nextDueDate}`,
        });

        nextPayment = await getPaymentById(ctx.userId, nextId);
      }
    }

    const payment = await getPaymentById(ctx.userId, id);

    return NextResponse.json({
      payment,
      nextPayment,
    });
  } catch (error) {
    console.error("[POST /api/payments/[id]/pay]", error);
    return NextResponse.json(
      { error: "Error marcando el pago como pagado" },
      { status: 500 }
    );
  }
}
