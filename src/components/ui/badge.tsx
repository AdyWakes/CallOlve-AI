import { cn } from "@/lib/utils";

export type BadgeVariant =
  | "default"
  | "brand"
  | "violet"
  | "ok"
  | "warn"
  | "bad"
  | "outline";

const variants: Record<BadgeVariant, string> = {
  default: "bg-raised text-mute border-line",
  brand: "bg-brand/10 text-brand border-brand/25",
  violet: "bg-violet-500/10 text-violet-300 border-violet-500/25",
  ok: "bg-ok/10 text-ok border-ok/25",
  warn: "bg-warn/10 text-warn border-warn/25",
  bad: "bg-bad/10 text-bad border-bad/25",
  outline: "bg-transparent text-mute border-line-bright",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: BadgeVariant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

/** Pulsing dot for live/active states. */
export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-2", className)}>
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ok opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-ok" />
    </span>
  );
}
