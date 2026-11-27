import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let cachedSql: NeonQueryFunction<false, false> | null = null;

/**
 * Retorna la instancia singleton de consulta HTTP serverless de Neon.
 * Valida la presencia de DATABASE_URL en tiempo de ejecución.
 */
export function getSql(): NeonQueryFunction<false, false> {
  if (cachedSql) return cachedSql;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL no está configurada. Define la variable en .env.local o en tu entorno."
    );
  }

  cachedSql = neon(url);
  return cachedSql;
}

/**
 * Registra una entrada en activity_logs sin interrumpir la operación principal si falla.
 * Mantiene un máximo de 50 registros recientes por usuario para evitar crecimiento innecesario de storage.
 */
export async function logActivity(params: {
  userId: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  summary: string;
}): Promise<void> {
  try {
    const sql = getSql();
    await sql`
      INSERT INTO activity_logs (user_id, action, target_type, target_id, summary)
      VALUES (
        ${params.userId},
        ${params.action},
        ${params.targetType},
        ${params.targetId ?? null},
        ${params.summary}
      )
    `;

    await sql`
      DELETE FROM activity_logs
      WHERE user_id = ${params.userId}
        AND id NOT IN (
          SELECT id
          FROM activity_logs
          WHERE user_id = ${params.userId}
          ORDER BY created_at DESC
          LIMIT 50
        )
    `;
  } catch (err) {
    console.error("[activity_logs] Error registrando actividad:", err);
  }
}
