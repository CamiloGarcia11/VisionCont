import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import { getAgendaItemById, getAgendaList } from "@/lib/data-queries";
import { getSql, logActivity } from "@/lib/db";
import { bogotaInputToIso } from "@/lib/format";
import {
  agendaItemSchema,
  formatZodError,
  isValidUuid,
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
    const items = await getAgendaList(ctx.userId, {
      entityId,
      itemType: sp.get("itemType") ?? undefined,
      status: sp.get("status") ?? undefined,
      from: sp.get("from") ?? undefined,
      to: sp.get("to") ?? undefined,
      search: sp.get("search") ?? undefined,
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[GET /api/agenda]", error);
    return NextResponse.json(
      { error: "Error obteniendo los elementos de agenda" },
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

    if (Number.isNaN(new Date(startAtIso).getTime())) {
      return NextResponse.json(
        { error: "Fecha de inicio inválida" },
        { status: 400 }
      );
    }

    const inserted = (await sql`
      INSERT INTO agenda_items (
        user_id,
        entity_id,
        title,
        description,
        item_type,
        start_at,
        end_at,
        all_day,
        location,
        status,
        priority,
        reminder_minutes
      ) VALUES (
        ${ctx.userId},
        ${data.entity_id},
        ${data.title},
        ${data.description ?? null},
        ${data.item_type},
        ${startAtIso},
        ${endAtIso},
        ${data.all_day},
        ${data.location ?? null},
        ${data.status},
        ${data.priority},
        ${data.reminder_minutes}
      )
      RETURNING id
    `) as { id: string }[];

    const newId = inserted[0]?.id;
    if (!newId) {
      return NextResponse.json(
        { error: "No se pudo crear el evento/trámite" },
        { status: 500 }
      );
    }

    await logActivity({
      userId: ctx.userId,
      action: "agenda_created",
      targetType: "agenda_item",
      targetId: newId,
      summary: `Agendó "${data.title}" (${data.item_type})`,
    });

    const item = await getAgendaItemById(ctx.userId, newId);

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/agenda]", error);
    return NextResponse.json(
      { error: "Error guardando el evento o trámite" },
      { status: 500 }
    );
  }
}
