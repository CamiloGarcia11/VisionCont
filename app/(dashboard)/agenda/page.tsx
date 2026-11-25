import { redirect } from "next/navigation";
import { AgendaClient } from "@/components/agenda/agenda-client";
import { getAuthenticatedContext } from "@/lib/auth-session";
import { getAgendaList, getEntitiesList } from "@/lib/data-queries";

export const dynamic = "force-dynamic";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) redirect("/login");

  const sp = await searchParams;
  const initialSearch = sp.search ?? "";

  const [items, entities] = await Promise.all([
    getAgendaList(ctx.userId, { search: initialSearch || undefined }),
    getEntitiesList(ctx.userId),
  ]);

  return (
    <AgendaClient
      initialItems={items}
      entities={entities}
      initialSearch={initialSearch}
    />
  );
}
