import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getNurseFormData } from "@/features/tickets/queries";
import { AppHeader } from "@/components/AppHeader";
import { GxaFooter } from "@/components/GxaFooter";
import { ToastProvider } from "@/components/ui/Toast";
import { TicketForm } from "./TicketForm";

export const metadata: Metadata = { title: "Procedură nouă" };

// Datele se schimbă în funcție de sesiune; nu cachea la build.
export const dynamic = "force-dynamic";

export default async function NursePage() {
  const session = await auth();
  // Apărare în adâncime: middleware gateează deja, dar reconfirmăm pe server.
  if (!session?.user || session.user.role !== Role.NURSE) {
    redirect("/login");
  }
  if (!session.user.specialtyId) {
    // Cont de asistentă fără specialitate — configurare invalidă.
    redirect("/login");
  }

  const specialty = await prisma.specialty.findUnique({
    where: { id: session.user.specialtyId },
    select: { name: true, active: true },
  });
  if (!specialty || !specialty.active) {
    redirect("/login");
  }

  const { doctors, procedures } = await getNurseFormData(session.user.specialtyId);

  return (
    <ToastProvider>
      <div className="min-h-dvh">
        <AppHeader
          title="Procedură nouă"
          subtitle={`Specialitate: ${specialty.name}`}
          username={session.user.username}
          role={session.user.role}
        />

        <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
          <TicketForm
            specialtyName={specialty.name}
            doctors={doctors}
            procedures={procedures}
          />
        </main>

        <footer className="pb-8 pt-4">
          <GxaFooter />
        </footer>
      </div>
    </ToastProvider>
  );
}
