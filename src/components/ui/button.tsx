import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 font-semibold " +
    "hover:brightness-110 active:brightness-95 shadow-[0_4px_24px_-8px_rgba(34,211,238,0.5)]",
  secondary:
    "border border-line-bright bg-raised/60 text-fg hover:bg-raised hover:border-line-bright",
  ghost: "text-mute hover:text-fg hover:bg-raised/70",
  danger: "bg-bad/10 text-bad border border-bad/30 hover:bg-bad/20",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

const base =
  "inline-flex items-center justify-center rounded-lg font-medium transition " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

interface ButtonLinkProps extends React.ComponentProps<typeof Link> {
  variant?: Variant;
  size?: Size;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}
