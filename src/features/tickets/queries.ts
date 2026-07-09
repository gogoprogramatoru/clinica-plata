import "server-only";
import { TicketStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { calculateTicketTotal, decimalToNumber } from "@/lib/tickets";
import type { TicketNewPayload } from "@/types/realtime";

/** Datele necesare formularului asistentei: medicii și procedurile specialității. */
export async function getNurseFormData(specialtyId: string) {
  const [doctors, procedures] = await Promise.all([
    prisma.doctor.findMany({
      where: { specialtyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.procedure.findMany({
      where: { specialtyId, active: true },
      select: { id: true, name: true, defaultPrice: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    doctors,
    procedures: procedures.map((p) => ({
      id: p.id,
      name: p.name,
      defaultPrice: decimalToNumber(p.defaultPrice),
    })),
  };
}

/** Coada de tichete în așteptare (toate specialitățile), pentru recepție. */
export async function getPendingTickets(): Promise<TicketNewPayload[]> {
  const tickets = await prisma.ticket.findMany({
    where: { status: TicketStatus.PENDING },
    orderBy: { createdAt: "asc" },
    include: {
      specialty: { select: { name: true } },
      doctor: { select: { name: true } },
      items: { select: { name: true, price: true } },
    },
  });

  return tickets.map((t) => ({
    id: t.id,
    patientName: t.patientName,
    specialtyName: t.specialty.name,
    doctorName: t.doctor?.name ?? null,
    isInsuredCAS: t.isInsuredCAS,
    observations: t.observations,
    createdAt: t.createdAt.toISOString(),
    items: t.items.map((i) => ({ name: i.name, price: decimalToNumber(i.price) })),
    total: calculateTicketTotal(
      t.items.map((i) => ({ price: decimalToNumber(i.price) })),
    ),
  }));
}

/** Contorul "Încasat azi": număr tichete și sumă totală în ziua curentă. */
export async function getTodayStats(): Promise<{ count: number; total: number }> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const paid = await prisma.ticket.findMany({
    where: {
      status: TicketStatus.PAID,
      paidAt: { gte: startOfDay },
    },
    select: { isInsuredCAS: true, items: { select: { price: true } } },
  });

  // Tichetele CAS nu aduc încasări (pacientul nu plătește), deci contribuie 0
  // la suma încasată. Sunt totuși numărate ca tichete procesate azi.
  const total = paid.reduce((sum, ticket) => {
    if (ticket.isInsuredCAS) return sum;
    return (
      sum +
      calculateTicketTotal(
        ticket.items.map((i) => ({ price: decimalToNumber(i.price) })),
      )
    );
  }, 0);

  return { count: paid.length, total: Math.round(total * 100) / 100 };
}
