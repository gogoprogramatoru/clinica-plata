/** Atribuire discretă GxA Solutions — folosită în footer și pe pagina de login. */
export function GxaFooter({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-center text-xs text-slate-400"}>
      Dezvoltat de{" "}
      <a
        href="https://gxasolutions.com"
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium text-slate-500 underline-offset-2 hover:text-brand-600 hover:underline"
      >
        GxA Solutions
      </a>
    </p>
  );
}
