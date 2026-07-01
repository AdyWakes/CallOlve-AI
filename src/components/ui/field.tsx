"use client";

import { cn } from "@/lib/utils";
import { useId } from "react";

const inputBase =
  "w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm text-fg " +
  "placeholder:text-faint transition focus:border-brand/60 focus:outline-none " +
  "focus:ring-2 focus:ring-brand/20 disabled:opacity-50";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputBase, className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(inputBase, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(inputBase, "appearance-none pr-8", className)} {...props}>
      {children}
    </select>
  );
}

/** Label + control + error wrapper keeping forms consistent and accessible. */
export function Field({
  label,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (id: string) => React.ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-sm font-medium text-mute">
        {label}
      </label>
      {children(id)}
      {hint && !error ? <p className="text-xs text-faint">{hint}</p> : null}
      {error ? <p className="text-xs text-bad">{error}</p> : null}
    </div>
  );
}
