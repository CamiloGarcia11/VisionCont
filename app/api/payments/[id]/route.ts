import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import { getPaymentById } from "@/lib/data-queries";
import { getSql, logActivity } from "@/lib/db";
import {
  formatZodError,
  isValidUuid,
  paymentSchema,
} from "@/lib/validators";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "ID de pago inválido" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = paymentSchema.safeParse(body);
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
      SELECT id, paid_at FROM payments WHERE id = ${id} AND user_id = ${ctx.userId} LIMIT 1
    `) as { id: string; paid_at: string | null }[];

    if (!existingRows[0]) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    if (data.entity_id) {
      const entityCheck = (await sql`
        SELECT id FROM entities WHERE id = ${data.entity_id} AND user_id = ${ctx.userId} LIMIT 1
      `) as { id: string }[];
      if (!entityCheck[0]) {
        return NextResponse.json(
          { error: "La entidad seleccionada no existe" },
          { status: 400 }
        );
      }
    }

    if (data.contact_id) {
      const contactCheck = (await sql`
        SELECT id FROM contacts WHERE id = ${data.contact_id} AND user_id = ${ctx.userId} LIMIT 1
      `) as { id: string }[];
      if (!contactCheck[0]) {
        return NextResponse.json(
          { error: "El contacto seleccionado no existe" },
          { status: 400 }
        );
      }
    }

    const dueTimeNormalized =
      data.due_time.length === 5 ? `${data.due_time}:00` : data.due_time;

    const paidAtValue =
      data.paid_at !== undefined && data.paid_at !== null
        ? data.paid_at
        : data.status === "pagado"
        ? existingRows[0].paid_at ?? new Date().toISOString()
        : null;

    await sql`
      UPDATE payments
      SET
        entity_id = ${data.entity_id},
        contact_id = ${data.contact_id},
        title = ${data.title},
        description = ${data.description ?? null},
        category = ${data.category},
        amount = ${data.amount},
        currency = ${data.currency},
        due_date = ${data.due_date}::date,
        due_time = ${dueTimeNormalized}::time,
        status = ${data.status},
        priority = ${data.priority},
        is_recurring = ${data.is_recurring},
        recurrence_rule = ${data.is_recurring ? (data.recurrence_rule ?? null) : null},
        reminder_days = ${data.reminder_days},
        receipt_url = ${data.receipt_url ?? null},
        paid_at = ${paidAtValue},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${ctx.userId}
    `;

    await logActivity({
      userId: ctx.userId,
      action: "payment_updated",
      targetType: "payment",
      targetId: id,
      summary: `Actualizó pago "${data.title}" (estado: ${data.status})`,
    });

    const payment = await getPaymentById(ctx.userId, id);

    return NextResponse.json({ payment });
  } catch (error) {
    console.error("[PUT /api/payments/[id]]", error);
    return NextResponse.json(
      { error: "Error actualizando el pago" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "ID de pago inválido" }, { status: 400 });
  }

  const sql = getSql();

  try {
    const rows = (await sql`
      SELECT id, title, google_event_id
      FROM payments
      WHERE id = ${id} AND user_id = ${ctx.userId}
      LIMIT 1
    `) as { id: string; title: string; google_event_id: string | null }[];

    const existing = rows[0];
    if (!existing) {
      return NextResponse.json(
        { error: "Pago no encontrado" },
        { status: 404 }
      );
    }

    await sql`
      DELETE FROM payments WHERE id = ${id} AND user_id = ${ctx.userId}
    `;

    await logActivity({
      userId: ctx.userId,
      action: "payment_deleted",
      targetType: "payment",
      targetId: id,
      summary: `Eliminó pago "${existing.title}"`,
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/payments/[id]]", error);
    return NextResponse.json(
      { error: "Error eliminando el pago" },
      { status: 500 }
    );
  }
}
