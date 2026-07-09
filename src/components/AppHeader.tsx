import { signOutAction } from "@/app/actions";

const ROLE_LABEL: Record<string, string> = {
  NURSE: "Asistentă",
  RECEPTION: "Recepție",
  ADMIN: "Administrator",
};

/**
 * Antet aplicație: titlu secțiune, identitatea utilizatorului și buton de
 * deconectare. Deconectarea folosește un server action (protejat CSRF).
 */
export function AppHeader({
  title,
  username,
  role,
  subtitle,
  children,
}: {
  title: string;
  username: string;
  role: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              C
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold leading-tight text-slate-800">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-xs text-slate-500">{subtitle}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {children}
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-700">{username}</p>
            <p className="text-xs text-slate-500">{ROLE_LABEL[role] ?? role}</p>
          </div>
          <form action={signOutAction}>
            <button
              type="submit"
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-surface-muted"
            >
              Ieșire
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
