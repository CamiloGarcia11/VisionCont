import { redirect } from "next/navigation";
import { EntitiesClient } from "@/components/entities/entities-client";
import { getAuthenticatedContext } from "@/lib/auth-session";
import { getContactsList, getEntitiesList } from "@/lib/data-queries";
import { isValidUuid } from "@/lib/validators";

export const dynamic = "force-dynamic";

export default async function EntidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ selected?: string }>;
}) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) redirect("/login");

  const sp = await searchParams;
  const selected =
    sp.selected && isValidUuid(sp.selected) ? sp.selected : undefined;

  const [entities, contacts] = await Promise.all([
    getEntitiesList(ctx.userId),
    getContactsList(ctx.userId),
  ]);

  return (
    <EntitiesClient
      initialEntities={entities}
      contacts={contacts}
      initialSelectedId={selected}
    />
  );
}
