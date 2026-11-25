import React from "react";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { getAuthenticatedContext } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthenticatedContext();
  if (!ctx) {
    redirect("/login");
  }

  return (
    <AppShell
      user={{
        name: ctx.user.name,
        email: ctx.user.email,
        image: ctx.user.image,
      }}
    >
      {children}
    </AppShell>
  );
}
