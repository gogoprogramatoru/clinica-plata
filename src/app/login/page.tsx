import type { Metadata } from "next";

import { GxaFooter } from "@/components/GxaFooter";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Autentificare",
};

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-surface-subtle to-brand-50/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-2xl font-bold text-white shadow-card">
            C
          </div>
          <h1 className="text-2xl font-semibold text-slate-800">Clinica Plata</h1>
          <p className="mt-1 text-sm text-slate-500">
            Autentificare în platforma internă
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
          <LoginForm />
        </div>

        <div className="mt-8">
          <GxaFooter />
        </div>
      </div>
    </main>
  );
}
