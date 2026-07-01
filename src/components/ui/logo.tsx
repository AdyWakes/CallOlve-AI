import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-lg",
        "bg-gradient-to-br from-cyan-400 to-violet-500 text-slate-950",
        className
      )}
      aria-hidden
    >
      {/* Phone + soundwave mark */}
      <svg viewBox="0 0 24 24" fill="none" className="size-5" strokeWidth={2.2} stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M5 4.5h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.5 1.5C9.6 19.5 4.5 14.4 4.5 6A1.5 1.5 0 0 1 5 4.5Z"
        />
        <path strokeLinecap="round" d="M14.5 5.5v3M17 4v6M19.5 5.5v3" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-lg font-bold tracking-tight text-fg">
        CallOlve<span className="text-gradient"> AI</span>
      </span>
    </Link>
  );
}
