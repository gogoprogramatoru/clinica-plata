import { cn } from "@/lib/utils";

type Tone = "brand" | "neutral" | "success" | "warning";

const tones: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-100",
  neutral: "bg-slate-100 text-slate-600 ring-slate-200",
  success: "bg-mint-50 text-mint-700 ring-mint-100",
  warning: "bg-amber-50 text-amber-700 ring-amber-100",
};

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
