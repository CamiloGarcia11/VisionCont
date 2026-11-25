import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import { getContactsList, normalizeContactRow } from "@/lib/data-queries";
import { getSql, logActivity } from "@/lib/db";
import { contactSchema, formatZodError } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

  const sp = req.nextUrl.searchParams;

  try {
    const contacts = await getContactsList(ctx.userId, {
      search: sp.get("search") ?? undefined,
      category: sp.get("category") ?? undefined,
    });
    return NextResponse.json({ contacts });
  } catch (error) {
    console.error("[GET /api/contacts]", error);
    return NextResponse.json(
      { error: "Error obteniendo el directorio de proveedores" },
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
      INSERT INTO contacts (
        user_id, name, category, tax_id, phone, email, bank_info, notes
      ) VALUES (
        ${ctx.userId},
        ${data.name},
        ${data.category ?? null},
        ${data.tax_id ?? null},
        ${data.phone ?? null},
        ${data.email ?? null},
        ${data.bank_info ?? null},
        ${data.notes ?? null}
      )
      RETURNING *
    `) as Record<string, unknown>[];

    const contact = rows[0] ? normalizeContactRow(rows[0]) : null;
    if (contact) {
      await logActivity({
        userId: ctx.userId,
        action: "contact_created",
        targetType: "contact",
        targetId: contact.id,
        summary: `Creó contacto/proveedor "${contact.name}"`,
      });
    }

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/contacts]", error);
    return NextResponse.json(
      { error: "Error guardando contacto" },
      { status: 500 }
    );
  }
}
