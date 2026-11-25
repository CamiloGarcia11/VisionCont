import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import { getDashboardData } from "@/lib/data-queries";
import { isValidUuid } from "@/lib/validators";

export async function GET(req: NextRequest) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

  const entityIdParam = req.nextUrl.searchParams.get("entityId") ?? "todos";
  if (entityIdParam !== "todos" && !isValidUuid(entityIdParam)) {
    return NextResponse.json({ error: "entityId inválido" }, { status: 400 });
  }

  try {
    const data = await getDashboardData(ctx.userId, entityIdParam);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/dashboard]", error);
    return NextResponse.json(
      { error: "Error cargando el resumen ejecutivo" },
      { status: 500 }
    );
  }
}
