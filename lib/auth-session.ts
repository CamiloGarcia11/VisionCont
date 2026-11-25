import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSql } from "@/lib/db";
import type { UserRow } from "@/types/database";

export interface AuthenticatedContext {
  userId: string;
  user: UserRow;
}

/**
 * Obtiene el usuario autenticado verificado contra Neon.
 * Retorna null si no hay sesión válida o el usuario no existe en DB.
 */
export async function getAuthenticatedContext(): Promise<AuthenticatedContext | null> {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;

  if (!userId && !email) {
    return null;
  }

  const sql = getSql();
  const rows = (
    userId
      ? await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`
      : await sql`SELECT * FROM users WHERE email = ${email!} LIMIT 1`
  ) as UserRow[];

  const user = rows[0];
  if (!user) {
    return null;
  }

  return { userId: user.id, user };
}

export function unauthorizedJson() {
  return NextResponse.json(
    { error: "No autorizado. Inicia sesión con Google para continuar." },
    { status: 401 }
  );
}
