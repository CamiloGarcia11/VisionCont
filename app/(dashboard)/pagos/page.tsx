import { redirect } from "next/navigation";
import { PaymentsClient } from "@/components/payments/payments-client";
import { getAuthenticatedContext } from "@/lib/auth-session";
import {
  getContactsList,
  getEntitiesList,
  getPaymentsList,
} from "@/lib/data-queries";

export const dynamic = "force-dynamic";

export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) redirect("/login");

  const sp = await searchParams;
  const initialSearch = sp.search ?? "";

  const [payments, entities, contacts] = await Promise.all([
    getPaymentsList(ctx.userId, { search: initialSearch || undefined }),
    getEntitiesList(ctx.userId),
    getContactsList(ctx.userId),
  ]);

  return (
    <PaymentsClient
      initialPayments={payments}
      entities={entities}
      contacts={contacts}
      initialSearch={initialSearch}
    />
  );
}
