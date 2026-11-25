import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSql, logActivity } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { formatZodError } from "@/lib/validators";

const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(120, "Máximo 120 caracteres"),
  email: z
    .string()
    .trim()
    .email("Correo electrónico inválido")
    .max(180),
  password: z
    .string()
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(128, "Máximo 128 caracteres"),
});

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: formatZodError(parsed.error) },
      { status: 400 }
    );
  }

  const name = parsed.data.name;
  const email = parsed.data.email.toLowerCase();
  const passwordHash = hashPassword(parsed.data.password);
  const sql = getSql();

  try {
    const existing = (await sql`
      SELECT id, password_hash FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1
    `) as { id: string; password_hash: string | null }[];

    if (existing[0]?.password_hash) {
      return NextResponse.json(
        { error: "Ya existe una cuenta registrada con este correo." },
        { status: 409 }
      );
    }

    let userId: string | undefined;

    if (existing[0]) {
      const updated = (await sql`
        UPDATE users
        SET name = ${name}, password_hash = ${passwordHash}, updated_at = NOW()
        WHERE id = ${existing[0].id}
        RETURNING id
      `) as { id: string }[];
      userId = updated[0]?.id;
    } else {
      const inserted = (await sql`
        INSERT INTO users (email, name, password_hash)
        VALUES (${email}, ${name}, ${passwordHash})
        RETURNING id
      `) as { id: string }[];
      userId = inserted[0]?.id;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "No se pudo crear la cuenta" },
        { status: 500 }
      );
    }

    await logActivity({
      userId,
      action: "auth_register",
      targetType: "user",
      targetId: userId,
      summary: `Creó cuenta de acceso (${email})`,
    });

    return NextResponse.json({ ok: true, id: userId, email }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/auth/register]", error);
    return NextResponse.json(
      { error: "Error creando la cuenta en la base de datos" },
      { status: 500 }
    );
  }
}
