"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Field, Input } from "@/components/ui/Field";
import { loginAction, type LoginState } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
    >
      {pending && (
        <span
          aria-hidden
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
        />
      )}
      {pending ? "Se autentifică…" : "Autentificare"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {state.error && (
        <div
          role="alert"
          className="rounded-xl border border-red-100 bg-red-50 px-3.5 py-2.5 text-sm text-red-700"
        >
          {state.error}
        </div>
      )}

      <Field label="Nume utilizator" htmlFor="username" required>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          maxLength={64}
        />
      </Field>

      <Field label="Parolă" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={200}
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
