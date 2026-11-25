import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import { getEntitiesList, normalizeEntityRow } from "@/lib/data-queries";
import { getSql, logActivity } from "@/lib/db";
import { entitySchema, formatZodError } from "@/lib/validators";

export async function GET() {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

  try {
    const entities = await getEntitiesList(ctx.userId);
    return NextResponse.json({ entities });
  } catch (error) {
    console.error("[GET /api/entities]", error);
    return NextResponse.json(
      { error: "Error obteniendo entidades" },
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
      INSERT INTO entities (user_id, name, type, color, quick_notes)
      VALUES (
        ${ctx.userId},
        ${data.name},
        ${data.type},
        ${data.color},
        ${data.quick_notes ?? null}
      )
      RETURNING *
    `) as Record<string, unknown>[];

    const entity = rows[0] ? normalizeEntityRow(rows[0]) : null;
    if (entity) {
      await logActivity({
        userId: ctx.userId,
        action: "entity_created",
        targetType: "entity",
        targetId: entity.id,
        summary: `Creó entidad "${entity.name}" (${entity.type})`,
      });
    }

    return NextResponse.json({ entity }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/entities]", error);
    return NextResponse.json(
      { error: "Error creando entidad" },
      { status: 500 }
    );
  }
}
