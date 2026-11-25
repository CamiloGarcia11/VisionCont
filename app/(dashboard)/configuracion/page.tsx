import { redirect } from "next/navigation";
import { SettingsClient } from "@/components/settings/settings-client";
import { getAuthenticatedContext } from "@/lib/auth-session";
import { getRecentActivityLogs } from "@/lib/data-queries";

export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const ctx = await getAuthenticatedContext();
  if (!ctx) redirect("/login");

  const logs = await getRecentActivityLogs(ctx.userId, 25);

  return (
    <SettingsClient
      initialProfile={{
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name,
        image: ctx.user.image,
      }}
      initialLogs={logs}
    />
  );
}
