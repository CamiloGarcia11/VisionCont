import { redirect } from "next/navigation";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import { getAuthenticatedContext } from "@/lib/auth-session";
import {
  getContactsList,
  getDashboardData,
  getEntitiesList,
} from "@/lib/data-queries";
import { isValidUuid } from "@/lib/validators";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ entityId?: string }>;
}) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) redirect("/login");

  const sp = await searchParams;
  const entityId =
    sp.entityId && isValidUuid(sp.entityId) ? sp.entityId : "todos";

  const [initialData, entities, contacts] = await Promise.all([
    getDashboardData(ctx.userId, entityId),
    getEntitiesList(ctx.userId),
    getContactsList(ctx.userId),
  ]);

  return (
    <DashboardClient
      initialData={initialData}
      entities={entities}
      contacts={contacts}
      initialEntityId={entityId}
    />
  );
}
