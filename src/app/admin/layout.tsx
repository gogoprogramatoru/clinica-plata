import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { AppHeader } from "@/components/AppHeader";
import { GxaFooter } from "@/components/GxaFooter";
import { ToastProvider } from "@/components/ui/Toast";
import { AdminNav } from "./AdminNav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.ADMIN) {
    redirect("/login");
  }

  return (
    <ToastProvider>
      <div className="min-h-dvh">
        <AppHeader
          title="Administrare"
          subtitle="Configurarea sistemului"
          username={session.user.username}
          role={session.user.role}
        />
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <AdminNav />
          <main className="mt-6">{children}</main>
        </div>
        <footer className="pb-8 pt-4">
          <GxaFooter />
        </footer>
      </div>
    </ToastProvider>
  );
}
