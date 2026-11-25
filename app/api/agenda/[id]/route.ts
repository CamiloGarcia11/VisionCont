import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import { getAgendaItemById } from "@/lib/data-queries";
import { getSql, logActivity } from "@/lib/db";
import { bogotaInputToIso } from "@/lib/format";
import {
  agendaItemSchema,
  formatZodError,
  isValidUuid,
} from "@/lib/validators";

const statusPatchSchema = z.object({
  status: z.enum(["pendiente", "en_progreso", "completado", "cancelado"]),
});

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

  const parsed = agendaItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const sql = getSql();

  try {
    const existing = (await sql`
      SELECT id FROM agenda_items WHERE id = ${id} AND user_id = ${ctx.userId} LIMIT 1
    `) as { id: string }[];
    if (!existing[0]) {
      return NextResponse.json(
        { error: "Elemento de agenda no encontrado" },
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

    const startAtIso = bogotaInputToIso(data.start_at, data.all_day);
    const endAtIso = data.end_at
      ? bogotaInputToIso(data.end_at, data.all_day)
      : null;

    await sql`
      UPDATE agenda_items
      SET
        entity_id = ${data.entity_id},
        title = ${data.title},
        description = ${data.description ?? null},
        item_type = ${data.item_type},
        start_at = ${startAtIso},
        end_at = ${endAtIso},
        all_day = ${data.all_day},
        location = ${data.location ?? null},
        status = ${data.status},
        priority = ${data.priority},
        reminder_minutes = ${data.reminder_minutes},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${ctx.userId}
    `;

    await logActivity({
      userId: ctx.userId,
      action: "agenda_updated",
      targetType: "agenda_item",
      targetId: id,
      summary: `Actualizó "${data.title}" (estado: ${data.status})`,
    });

    const item = await getAgendaItemById(ctx.userId, id);

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[PUT /api/agenda/[id]]", error);
    return NextResponse.json(
      { error: "Error actualizando el elemento de agenda" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

  const parsed = statusPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const sql = getSql();

  try {
    const updated = (await sql`
      UPDATE agenda_items
      SET status = ${parsed.data.status}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${ctx.userId}
      RETURNING title
    `) as { title: string }[];

    if (!updated[0]) {
      return NextResponse.json(
        { error: "Elemento de agenda no encontrado" },
        { status: 404 }
      );
    }

    await logActivity({
      userId: ctx.userId,
      action:
        parsed.data.status === "completado"
          ? "agenda_completed"
          : "agenda_status_changed",
      targetType: "agenda_item",
      targetId: id,
      summary: `Cambió estado de "${updated[0].title}" a ${parsed.data.status}`,
    });

    const item = await getAgendaItemById(ctx.userId, id);

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[PATCH /api/agenda/[id]]", error);
    return NextResponse.json(
      { error: "Error actualizando estado en agenda" },
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
    const rows = (await sql`
      SELECT id, title, google_event_id
      FROM agenda_items
      WHERE id = ${id} AND user_id = ${ctx.userId}
      LIMIT 1
    `) as { id: string; title: string; google_event_id: string | null }[];

    const existing = rows[0];
    if (!existing) {
      return NextResponse.json(
        { error: "Elemento de agenda no encontrado" },
        { status: 404 }
      );
    }

    await sql`
      DELETE FROM agenda_items WHERE id = ${id} AND user_id = ${ctx.userId}
    `;

    await logActivity({
      userId: ctx.userId,
      action: "agenda_deleted",
      targetType: "agenda_item",
      targetId: id,
      summary: `Eliminó "${existing.title}" de agenda`,
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/agenda/[id]]", error);
    return NextResponse.json(
      { error: "Error eliminando el elemento de agenda" },
      { status: 500 }
    );
  }
}
