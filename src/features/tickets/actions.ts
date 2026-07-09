"use server";

import { Prisma, Role, TicketStatus } from "@prisma/client";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { prisma } from "@/lib/prisma";
import { requireNurse, requireRole, AuthError } from "@/lib/auth-guards";
import { createTicketSchema } from "@/lib/validation/ticket";
import { calculateTicketTotal, decimalToNumber } from "@/lib/tickets";
import { emitTicketNew, emitTicketPaid } from "@/lib/realtime";
import { rateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { ok, fail, toActionError, type ActionResult } from "@/lib/action-result";
import type { TicketNewPayload } from "@/types/realtime";

// Max 40 tichete / minut / asistentă — previne abuzul, dar nu incomodează.
const TICKET_LIMIT = 40;
const TICKET_WINDOW_MS = 60_000;

/**
 * Creează un tichet (status PENDING) cu liniile aferente. Reguli:
 *  - doar NURSE, legat de specialitatea contului (verificat pe server),
 *  - medicul și procedurile din catalog trebuie să aparțină ACELEI specialități,
 *  - prețul fiecărei linii se salvează ca snapshot (valoarea trimisă, editabilă),
 *  - numele procedurilor din catalog se ia din DB (autoritar, anti-tampering).
 * La final, notifică recepția prin Socket.io.
 */
export async function createTicketAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const nurse = await requireNurse();

    const requestHeaders = await headers();
    const rl = rateLimit(
      `ticket:${nurse.id}:${clientKeyFromHeaders(requestHeaders)}`,
      TICKET_LIMIT,
      TICKET_WINDOW_MS,
    );
    if (!rl.success) {
      return fail("Prea multe tichete într-un timp scurt. Așteptați puțin.");
    }

    const data = createTicketSchema.parse(input);

    // --- Validare medic (dacă e specificat) ---
    if (data.doctorId) {
      const doctor = await prisma.doctor.findFirst({
        where: {
          id: data.doctorId,
          specialtyId: nurse.specialtyId,
          active: true,
        },
        select: { id: true },
      });
      if (!doctor) {
        return fail("Medic invalid pentru specialitatea dvs.", {
          doctorId: "Medic invalid.",
        });
      }
    }

    // --- Validare proceduri din catalog ---
    const catalogIds = data.items
      .filter((i) => !i.isCustom && i.procedureId)
      .map((i) => i.procedureId as string);

    const procedures = catalogIds.length
      ? await prisma.procedure.findMany({
          where: {
            id: { in: catalogIds },
            specialtyId: nurse.specialtyId,
            active: true,
          },
          select: { id: true, name: true },
        })
      : [];
    const procById = new Map(procedures.map((p) => [p.id, p]));

    // Fiecare procedură din catalog trebuie să existe în specialitatea asistentei.
    for (const item of data.items) {
      if (!item.isCustom) {
        if (!item.procedureId || !procById.has(item.procedureId)) {
          return fail("O procedură selectată nu aparține specialității dvs.", {
            items: "Procedură invalidă.",
          });
        }
      }
    }

    // --- Construim liniile cu prețuri snapshot ---
    const items = data.items.map((item) => {
      const name = item.isCustom
        ? item.name
        : procById.get(item.procedureId as string)!.name;
      return {
        procedureId: item.isCustom ? null : (item.procedureId as string),
        name,
        price: new Prisma.Decimal(item.price.toFixed(2)),
        isCustom: item.isCustom,
      };
    });

    const created = await prisma.ticket.create({
      data: {
        patientName: data.patientName,
        specialtyId: nurse.specialtyId,
        doctorId: data.doctorId ?? null,
        observations: data.observations,
        isInsuredCAS: data.isInsuredCAS,
        status: TicketStatus.PENDING,
        createdByUserId: nurse.id,
        items: { create: items },
      },
      include: {
        specialty: { select: { name: true } },
        doctor: { select: { name: true } },
        items: { select: { name: true, price: true } },
      },
    });

    // --- Notificare real-time către recepție ---
    const payload: TicketNewPayload = {
      id: created.id,
      patientName: created.patientName,
      specialtyName: created.specialty.name,
      doctorName: created.doctor?.name ?? null,
      isInsuredCAS: created.isInsuredCAS,
      observations: created.observations,
      createdAt: created.createdAt.toISOString(),
      items: created.items.map((i) => ({
        name: i.name,
        price: decimalToNumber(i.price),
      })),
      total: calculateTicketTotal(
        created.items.map((i) => ({ price: decimalToNumber(i.price) })),
      ),
    };
    emitTicketNew(payload);

    return ok({ id: created.id });
  } catch (error) {
    return toActionError(error);
  }
}

/**
 * Marchează un tichet ca PAID. Doar RECEPTION. Idempotent și fără race:
 * folosim updateMany cu condiția status=PENDING, deci două posturi de recepție
 * nu pot încasa același tichet de două ori.
 */
export async function payTicketAction(
  ticketId: unknown,
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requireRole(Role.RECEPTION);

    if (typeof ticketId !== "string" || ticketId.length === 0 || ticketId.length > 64) {
      return fail("Tichet invalid.");
    }

    const result = await prisma.ticket.updateMany({
      where: { id: ticketId, status: TicketStatus.PENDING },
      data: {
        status: TicketStatus.PAID,
        paidAt: new Date(),
        paidByUserId: user.id,
      },
    });

    if (result.count === 0) {
      // Deja încasat de altcineva sau inexistent.
      return fail("Tichetul a fost deja încasat sau nu mai există.");
    }

    emitTicketPaid({ id: ticketId });
    revalidatePath("/reception");

    return ok({ id: ticketId });
  } catch (error) {
    if (error instanceof AuthError) return toActionError(error);
    return toActionError(error);
  }
}
