import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import { normalizeContactRow } from "@/lib/data-queries";
import { getSql, logActivity } from "@/lib/db";
import { contactSchema, formatZodError, isValidUuid } from "@/lib/validators";

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

  const parsed = contactSchema.safeParse(body);
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
      UPDATE contacts
      SET
        name = ${data.name},
        category = ${data.category ?? null},
        tax_id = ${data.tax_id ?? null},
        phone = ${data.phone ?? null},
        email = ${data.email ?? null},
        bank_info = ${data.bank_info ?? null},
        notes = ${data.notes ?? null},
        updated_at = NOW()
      WHERE id = ${id} AND user_id = ${ctx.userId}
      RETURNING *
    `) as Record<string, unknown>[];

    if (!rows[0]) {
      return NextResponse.json(
        { error: "Contacto no encontrado" },
        { status: 404 }
      );
    }

    const contact = normalizeContactRow(rows[0]);
    await logActivity({
      userId: ctx.userId,
      action: "contact_updated",
      targetType: "contact",
      targetId: contact.id,
      summary: `Actualizó contacto "${contact.name}"`,
    });

    return NextResponse.json({ contact });
  } catch (error) {
    console.error("[PUT /api/contacts/[id]]", error);
    return NextResponse.json(
      { error: "Error actualizando contacto" },
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
      SELECT id, name FROM contacts WHERE id = ${id} AND user_id = ${ctx.userId} LIMIT 1
    `) as { id: string; name: string }[];

    if (!existing[0]) {
      return NextResponse.json(
        { error: "Contacto no encontrado" },
        { status: 404 }
      );
    }

    await sql.transaction([
      sql`UPDATE payments SET contact_id = NULL WHERE contact_id = ${id} AND user_id = ${ctx.userId}`,
      sql`DELETE FROM contacts WHERE id = ${id} AND user_id = ${ctx.userId}`,
    ]);

    await logActivity({
      userId: ctx.userId,
      action: "contact_deleted",
      targetType: "contact",
      targetId: id,
      summary: `Eliminó contacto "${existing[0].name}"`,
    });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/contacts/[id]]", error);
    return NextResponse.json(
      { error: "Error eliminando contacto" },
      { status: 500 }
    );
  }
}
