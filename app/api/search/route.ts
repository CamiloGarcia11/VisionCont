import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import { getSql } from "@/lib/db";
import { dateColumnToIso } from "@/lib/format";

export async function GET(req: NextRequest) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({
      payments: [],
      agenda: [],
      entities: [],
      contacts: [],
    });
  }

  const pattern = `%${q}%`;
  const sql = getSql();

  try {
    const [payments, agenda, entities, contacts] = await Promise.all([
      sql`
        SELECT id, title, amount, currency, due_date, status
        FROM payments
        WHERE user_id = ${ctx.userId}
          AND (title ILIKE ${pattern} OR COALESCE(description, '') ILIKE ${pattern})
        ORDER BY due_date ASC
        LIMIT 5
      `,
      sql`
        SELECT id, title, item_type, start_at, status
        FROM agenda_items
        WHERE user_id = ${ctx.userId}
          AND (title ILIKE ${pattern} OR COALESCE(description, '') ILIKE ${pattern} OR COALESCE(location, '') ILIKE ${pattern})
        ORDER BY start_at ASC
        LIMIT 5
      `,
      sql`
        SELECT id, name, type, color
        FROM entities
        WHERE user_id = ${ctx.userId}
          AND (name ILIKE ${pattern} OR COALESCE(quick_notes, '') ILIKE ${pattern})
        ORDER BY name ASC
        LIMIT 5
      `,
      sql`
        SELECT id, name, category, tax_id, bank_info
        FROM contacts
        WHERE user_id = ${ctx.userId}
          AND (name ILIKE ${pattern} OR COALESCE(tax_id, '') ILIKE ${pattern} OR COALESCE(bank_info, '') ILIKE ${pattern})
        ORDER BY name ASC
        LIMIT 5
      `,
    ]);

    const normalizedPayments = (payments as Record<string, unknown>[]).map((p) => ({
      ...p,
      amount: Number(p.amount ?? 0),
      due_date: dateColumnToIso(p.due_date as string | Date),
    }));

    return NextResponse.json({
      payments: normalizedPayments,
      agenda,
      entities,
      contacts,
    });
  } catch (error) {
    console.error("[GET /api/search]", error);
    return NextResponse.json(
      { error: "Error en la búsqueda rápida" },
      { status: 500 }
    );
  }
}
