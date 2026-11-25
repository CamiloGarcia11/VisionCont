import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import { getPaymentById, getPaymentsList } from "@/lib/data-queries";
import { getSql, logActivity } from "@/lib/db";
import {
  formatZodError,
  isValidUuid,
  paymentSchema,
} from "@/lib/validators";

export async function GET(req: NextRequest) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

  const sp = req.nextUrl.searchParams;
  const entityId = sp.get("entityId") ?? undefined;
  if (entityId && entityId !== "todos" && !isValidUuid(entityId)) {
    return NextResponse.json({ error: "entityId inválido" }, { status: 400 });
  }

  try {
    const payments = await getPaymentsList(ctx.userId, {
      status: sp.get("status") ?? undefined,
      category: sp.get("category") ?? undefined,
      entityId,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      search: sp.get("search") ?? undefined,
    });

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("[GET /api/payments]", error);
    return NextResponse.json(
      { error: "Error obteniendo los pagos" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

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

    const inserted = (await sql`
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
        reminder_days,
        receipt_url,
        paid_at
      ) VALUES (
        ${ctx.userId},
        ${data.entity_id},
        ${data.contact_id},
        ${data.title},
        ${data.description ?? null},
        ${data.category},
        ${data.amount},
        ${data.currency},
        ${data.due_date}::date,
        ${dueTimeNormalized}::time,
        ${data.status},
        ${data.priority},
        ${data.is_recurring},
        ${data.is_recurring ? (data.recurrence_rule ?? null) : null},
        ${data.reminder_days},
        ${data.receipt_url ?? null},
        ${data.paid_at ? data.paid_at : data.status === "pagado" ? new Date().toISOString() : null}
      )
      RETURNING id
    `) as { id: string }[];

    const newId = inserted[0]?.id;
    if (!newId) {
      return NextResponse.json(
        { error: "No se pudo crear el pago" },
        { status: 500 }
      );
    }

    await logActivity({
      userId: ctx.userId,
      action: "payment_created",
      targetType: "payment",
      targetId: newId,
      summary: `Creó pago "${data.title}" (${data.due_date})`,
    });

    const payment = await getPaymentById(ctx.userId, newId);

    return NextResponse.json({ payment }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/payments]", error);
    return NextResponse.json(
      { error: "Error guardando el pago en la base de datos" },
      { status: 500 }
    );
  }
}
