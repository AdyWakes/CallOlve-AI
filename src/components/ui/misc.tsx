import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  className,
  color,
}: {
  name: string;
  className?: string;
  color?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-line-bright bg-raised text-xs font-semibold text-fg",
        className
      )}
      style={color ? { backgroundColor: `${color}22`, color, borderColor: `${color}44` } : undefined}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-line-bright border-t-brand",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-line-bright px-6 py-14 text-center",
        className
      )}
    >
      {icon ? <div className="mb-3 text-faint">{icon}</div> : null}
      <h3 className="font-display text-base font-semibold text-fg">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-mute">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
  icon,
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("glass rounded-2xl p-5", className)}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium tracking-wide text-mute uppercase">{label}</p>
        {icon ? <span className="text-brand">{icon}</span> : null}
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-fg">{value}</p>
      {sub ? <p className="mt-1 text-xs text-faint">{sub}</p> : null}
    </div>
  );
}

export function ProgressBar({
  value,
  className,
  barClassName,
}: {
  value: number; // 0..100
  className?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-raised", className)}>
      <div
        className={cn("h-full rounded-full bg-gradient-to-r from-cyan-400 to-violet-500", barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
