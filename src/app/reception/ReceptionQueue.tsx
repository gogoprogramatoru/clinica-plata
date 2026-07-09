"use client";

import { useCallback, useRef, useState } from "react";

import type { TicketNewPayload } from "@/types/realtime";
import { useReceptionSocket } from "@/lib/useReceptionSocket";
import { payTicketAction } from "@/features/tickets/actions";
import { formatMoney } from "@/lib/utils";
import { useToast } from "@/components/ui/Toast";
import { EmptyState } from "@/components/ui/EmptyState";
import { TicketCard } from "./TicketCard";

interface Stats {
  count: number;
  total: number;
}

/** Beep scurt și discret prin WebAudio (fără fișier extern → CSP-friendly). */
function useBeep() {
  const ctxRef = useRef<AudioContext | null>(null);
  return useCallback(() => {
    try {
      if (!ctxRef.current) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        ctxRef.current = new Ctor();
      }
      const ctx = ctxRef.current;
      if (ctx.state === "suspended") void ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.06, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      osc.connect(gain).connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.26);
    } catch {
      // Sunetul e opțional; ignorăm orice eroare (autoplay policy etc.).
    }
  }, []);
}

export function ReceptionQueue({
  initialTickets,
  initialStats,
}: {
  initialTickets: TicketNewPayload[];
  initialStats: Stats;
}) {
  const toast = useToast();
  const beep = useBeep();
  const [tickets, setTickets] = useState<TicketNewPayload[]>(initialTickets);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [payingId, setPayingId] = useState<string | null>(null);

  const flagNew = useCallback((id: string) => {
    setHighlighted((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setHighlighted((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 6000);
  }, []);

  const handleNew = useCallback(
    (payload: TicketNewPayload) => {
      setTickets((prev) => {
        // Evită dublurile dacă evenimentul sosește de mai multe ori.
        if (prev.some((t) => t.id === payload.id)) return prev;
        return [payload, ...prev];
      });
      flagNew(payload.id);
      beep();
      toast.push({
        variant: "info",
        title: "Tichet nou",
        description: payload.isInsuredCAS
          ? `${payload.patientName} · Asigurat CAS (nu plătește)`
          : `${payload.patientName} · ${formatMoney(payload.total)}`,
      });
    },
    [beep, flagNew, toast],
  );

  const handlePaidElsewhere = useCallback((payload: { id: string }) => {
    // Alt post de recepție a încasat — scoatem din coadă fără a atinge contorul
    // local (contorul reflectă doar încasările proprii ale acestei sesiuni).
    setTickets((prev) => prev.filter((t) => t.id !== payload.id));
  }, []);

  const { connected } = useReceptionSocket({
    onNew: handleNew,
    onPaid: handlePaidElsewhere,
  });

  async function handlePay(ticket: TicketNewPayload) {
    setPayingId(ticket.id);
    // Actualizare optimistă: scoatem imediat din coadă.
    const snapshot = tickets;
    setTickets((prev) => prev.filter((t) => t.id !== ticket.id));

    const result = await payTicketAction(ticket.id);
    setPayingId(null);

    if (result.ok) {
      // Pacienții CAS nu aduc încasare (0), dar sunt numărați ca procesați.
      const collected = ticket.isInsuredCAS ? 0 : ticket.total;
      setStats((s) => ({
        count: s.count + 1,
        total: Math.round((s.total + collected) * 100) / 100,
      }));
      toast.push({
        variant: "success",
        title: ticket.isInsuredCAS ? "Confirmat (CAS)" : "Încasat",
        description: `${ticket.patientName} · ${formatMoney(collected)}`,
      });
    } else {
      // Revert dacă a fost deja încasat între timp: îl scoatem oricum din listă
      // dacă mesajul indică asta; altfel restaurăm.
      if (result.error.includes("deja încasat")) {
        // rămâne scos din coadă
      } else {
        setTickets(snapshot);
      }
      toast.push({ variant: "error", title: "Eroare", description: result.error });
    }
  }

  return (
    <div className="space-y-6">
      {/* Bară de stare + contor "Încasat azi" */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card sm:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                În așteptare
              </p>
              <p className="mt-1 text-3xl font-semibold text-slate-800">
                {tickets.length}
              </p>
            </div>
            <ConnectionPill connected={connected} />
          </div>
        </div>
        <div className="rounded-2xl border border-mint-100 bg-mint-50/50 p-4 shadow-card">
          <p className="text-xs font-medium uppercase tracking-wide text-mint-700">
            Încasat azi
          </p>
          <p className="mt-1 text-2xl font-semibold text-mint-700">
            {formatMoney(stats.total)}
          </p>
          <p className="text-xs text-mint-600">
            {stats.count} {stats.count === 1 ? "tichet" : "tichete"}
          </p>
        </div>
      </div>

      {/* Coadă */}
      {tickets.length === 0 ? (
        <EmptyState
          title="Coada este goală"
          description="Tichetele noi trimise de asistente vor apărea aici instant."
          icon={
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
      ) : (
        <ul className="space-y-3">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              isNew={highlighted.has(ticket.id)}
              isPaying={payingId === ticket.id}
              onPay={() => handlePay(ticket)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function ConnectionPill({ connected }: { connected: boolean }) {
  return (
    <span
      className={
        connected
          ? "inline-flex items-center gap-1.5 rounded-full bg-mint-50 px-2.5 py-1 text-xs font-medium text-mint-700"
          : "inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700"
      }
    >
      <span
        className={
          connected
            ? "h-2 w-2 rounded-full bg-mint-500"
            : "h-2 w-2 animate-pulse rounded-full bg-amber-500"
        }
      />
      {connected ? "Conectat" : "Reconectare…"}
    </span>
  );
}
