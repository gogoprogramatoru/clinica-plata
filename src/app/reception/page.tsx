import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { getPendingTickets, getTodayStats } from "@/features/tickets/queries";
import { AppHeader } from "@/components/AppHeader";
import { GxaFooter } from "@/components/GxaFooter";
import { ToastProvider } from "@/components/ui/Toast";
import { ReceptionQueue } from "./ReceptionQueue";

export const metadata: Metadata = { title: "Recepție" };
export const dynamic = "force-dynamic";

export default async function ReceptionPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== Role.RECEPTION) {
    redirect("/login");
  }

  const [tickets, stats] = await Promise.all([
    getPendingTickets(),
    getTodayStats(),
  ]);

  return (
    <ToastProvider>
      <div className="min-h-dvh">
        <AppHeader
          title="Recepție"
          subtitle="Coadă de încasări în timp real"
          username={session.user.username}
          role={session.user.role}
        />
        <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          <ReceptionQueue initialTickets={tickets} initialStats={stats} />
        </main>
        <footer className="pb-8 pt-4">
          <GxaFooter />
        </footer>
      </div>
    </ToastProvider>
  );
}
