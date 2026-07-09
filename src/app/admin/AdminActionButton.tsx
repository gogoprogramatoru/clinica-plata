"use client";

import { useState, useTransition } from "react";

import type { ActionResult } from "@/lib/action-result";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

/**
 * Buton care invocă un server action cu input fix. Suportă confirmare explicită
 * (pentru ștergeri) și afișează feedback prin toast. Revalidarea din action
 * împrospătează automat lista.
 */
export function AdminActionButton<T>({
  action,
  input,
  confirmMessage,
  successMessage,
  children,
  ...buttonProps
}: {
  action: (input: T) => Promise<ActionResult>;
  input: T;
  confirmMessage?: string;
  successMessage?: string;
} & Omit<ButtonProps, "onClick" | "loading">) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function run() {
    startTransition(async () => {
      const result = await action(input);
      // Notă: unele acțiuni "reușesc" logic dar întorc ok:false cu un mesaj
      // informativ (ex. dezactivare în loc de ștergere). Le tratăm ca info.
      if (result.ok) {
        if (successMessage) {
          toast.push({ variant: "success", title: successMessage });
        }
      } else {
        toast.push({ variant: "info", title: "Notă", description: result.error });
      }
      setConfirming(false);
    });
  }

  function handleClick() {
    if (confirmMessage && !confirming) {
      setConfirming(true);
      return;
    }
    run();
  }

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <Button
          {...buttonProps}
          variant="danger"
          size="sm"
          loading={pending}
          onClick={run}
        >
          Confirmă
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Anulează
        </Button>
      </span>
    );
  }

  return (
    <Button {...buttonProps} loading={pending} onClick={handleClick} title={confirmMessage}>
      {children}
    </Button>
  );
}
