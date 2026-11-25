import { NextResponse } from "next/server";
import { getAuthenticatedContext, unauthorizedJson } from "@/lib/auth-session";
import { getRecentActivityLogs } from "@/lib/data-queries";

export async function GET() {
  const ctx = await getAuthenticatedContext();
  if (!ctx) return unauthorizedJson();

  try {
    const logs = await getRecentActivityLogs(ctx.userId, 25);

    return NextResponse.json({
      profile: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        image: ctx.user.image,
      },
      logs,
    });
  } catch (error) {
    console.error("[GET /api/settings]", error);
    return NextResponse.json(
      { error: "Error cargando la configuración" },
      { status: 500 }
    );
  }
}
