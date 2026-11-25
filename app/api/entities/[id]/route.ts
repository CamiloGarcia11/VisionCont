import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import {
  getAgendaList,
  getPaymentsList,
  normalizeEntityRow,
} from "@/lib/data-queries";
import { getSql, logActivity } from "@/lib/db";
import { entitySchema, formatZodError, isValidUuid } from "@/lib/validators";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const sql = getSql();

  try {
    const rows = (await sql`
      SELECT * FROM entities WHERE id = ${id} AND user_id = ${ctx.userId} LIMIT 1
    `) as Record<string, unknown>[];

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Entidad no encontrada" },
        { status: 404 }
      );
    }

    const entity = normalizeEntityRow(rows[0]);
    const [payments, agenda] = await Promise.all([
      getPaymentsList(ctx.userId, { entityId: id }),
      getAgendaList(ctx.userId, { entityId: id }),
    ]);

    return NextResponse.json({ entity, payments, agenda });
  } catch (error) {
    console.error("[GET /api/entities/[id]]", error);
    return NextResponse.json(
      { error: "Error cargando consolidado de entidad" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = entitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const sql = getSql();

  try {
    const rows = (await sql`
      UPDATE entities
      SET
        name = ${data.name},
        type = ${data.type},
        color = ${data.color},
        quick_notes = ${data.quick_notes ?? null},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${ctx.userId}
      RETURNING *
    `) as Record<string, unknown>[];

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Entidad no encontrada" },
        { status: 404 }
      );
    }

    const entity = normalizeEntityRow(rows[0]);
    await logActivity({
      userId: ctx.userId,
      action: "entity_updated",
      targetType: "entity",
      targetId: entity.id,
      summary: `Actualizó entidad "${entity.name}"`,
    });

    return NextResponse.json({ entity });
  } catch (error) {
    console.error("[PUT /api/entities/[id]]", error);
    return NextResponse.json(
      { error: "Error actualizando entidad" },
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
    return NextResponse.json({ error: "ID inválido" }, { status: 400 });
  }

  const sql = getSql();

  try {
    const existing = (await sql`
      SELECT id, name FROM entities WHERE id = ${id} AND user_id = ${ctx.userId} LIMIT 1
    `) as { id: string; name: string }[];

    if (!existing[0]) {
      return NextResponse.json(
        { error: "Entidad no encontrada" },
        { status: 404 }
      );
    }

    await sql.transaction([
      sql`UPDATE payments SET entity_id = NULL WHERE entity_id = ${id} AND user_id = ${ctx.userId}`,
      sql`UPDATE agenda_items SET entity_id = NULL WHERE entity_id = ${id} AND user_id = ${ctx.userId}`,
      sql`DELETE FROM entities WHERE id = ${id} AND user_id = ${ctx.userId}`,
    ]);

    await logActivity({
      userId: ctx.userId,
      action: "entity_deleted",
      targetType: "entity",
      targetId: id,
      summary: `Eliminó entidad "${existing[0].name}"`,
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/entities/[id]]", error);
    return NextResponse.json(
      { error: "Error eliminando entidad" },
      { status: 500 }
    );
  }
}
