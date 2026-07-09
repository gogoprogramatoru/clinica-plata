"use client";

import { useState } from "react";

import type { TicketNewPayload } from "@/types/realtime";
import { cn, formatMoney, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function TicketCard({
  ticket,
  isNew,
  isPaying,
  onPay,
}: {
  ticket: TicketNewPayload;
  isNew: boolean;
  isPaying: boolean;
  onPay: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  // Suma efectiv de încasat: 0 pentru pacienți asigurați CAS.
  const payable = ticket.isInsuredCAS ? 0 : ticket.total;

  return (
    <li
      className={cn(
        "rounded-2xl border bg-white shadow-card transition-all",
        isNew
          ? "animate-slide-in border-brand-300 ring-2 ring-brand-200"
          : "border-slate-100",
      )}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold text-slate-800">
              {ticket.patientName}
            </h3>
            <Badge tone="brand">{ticket.specialtyName}</Badge>
            {ticket.isInsuredCAS && <Badge tone="success">Asigurat CAS</Badge>}
            {isNew && <Badge tone="warning">Nou</Badge>}
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {formatDateTime(ticket.createdAt)}
            {ticket.doctorName ? ` · ${ticket.doctorName}` : ""}
          </p>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-1 text-xs font-medium text-brand-600 hover:text-brand-700"
            aria-expanded={expanded}
          >
            {expanded ? "Ascunde detaliile" : "Vezi detaliile"}
          </button>
        </div>

        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="text-right">
            <p className="text-xs text-slate-400">De încasat</p>
            <p className="text-xl font-semibold text-slate-800">
              {formatMoney(payable)}
            </p>
            {ticket.isInsuredCAS && (
              <p className="text-xs font-medium text-mint-600">
                CAS · servicii {formatMoney(ticket.total)}
              </p>
            )}
          </div>
          <Button
            variant="success"
            size="md"
            loading={isPaying}
            onClick={onPay}
            className="min-w-[7.5rem]"
          >
            {ticket.isInsuredCAS ? "Confirmă" : "Încasat"}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 bg-surface-subtle px-4 py-3 sm:px-5">
          <ul className="divide-y divide-slate-100">
            {ticket.items.map((item, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <span className="text-slate-600">{item.name}</span>
                <span className="font-medium text-slate-700">
                  {formatMoney(item.price)}
                </span>
              </li>
            ))}
          </ul>
          {ticket.observations && (
            <p className="mt-2 rounded-lg bg-white p-2.5 text-sm text-slate-500">
              <span className="font-medium text-slate-600">Observații: </span>
              {ticket.observations}
            </p>
          )}
        </div>
      )}
    </li>
  );
}
