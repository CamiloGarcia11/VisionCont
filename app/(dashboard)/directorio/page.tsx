import { redirect } from "next/navigation";
import { ContactsClient } from "@/components/contacts/contacts-client";
import { getAuthenticatedContext } from "@/lib/auth-session";
import { getContactsList } from "@/lib/data-queries";

export const dynamic = "force-dynamic";

export default async function DirectorioPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) redirect("/login");

  const sp = await searchParams;
  const initialSearch = sp.search ?? "";
  const contacts = await getContactsList(ctx.userId, {
    search: initialSearch || undefined,
  });

  return (
    <ContactsClient
      initialContacts={contacts}
      initialSearch={initialSearch}
    />
  );
}
