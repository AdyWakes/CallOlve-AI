"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import {
  BarChart3,
  Bot,
  CalendarCheck,
  LayoutDashboard,
  Menu,
  PhoneCall,
  Play,
  Plug,
  Radio,
  Settings,
  ShoppingBag,
  Siren,
  Target,
  X,
} from "lucide-react";

const groups: {
  title: string;
  items: { href: string; label: string; icon: React.ElementType }[];
}[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
    ],
  },
  {
    title: "AI Call Center",
    items: [
      { href: "/assistants", label: "Assistants", icon: Bot },
      { href: "/calls", label: "Calls", icon: PhoneCall },
      { href: "/voice", label: "Live AI call", icon: Radio },
      { href: "/simulator", label: "Simulator", icon: Play },
    ],
  },
  {
    title: "Automation",
    items: [
      { href: "/appointments", label: "Appointments", icon: CalendarCheck },
      { href: "/orders", label: "Orders", icon: ShoppingBag },
      { href: "/leads", label: "Leads", icon: Target },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/integrations", label: "Integrations", icon: Plug },
      { href: "/sos", label: "SOS Emergency", icon: Siren },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
      {groups.map((g) => (
        <div key={g.title}>
          <p className="px-3 pb-2 text-[10px] font-semibold tracking-widest text-faint uppercase">
            {g.title}
          </p>
          <ul className="space-y-0.5">
            {g.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                      active
                        ? "bg-brand/10 font-medium text-brand"
                        : "text-mute hover:bg-raised/70 hover:text-fg",
                      item.href === "/sos" && !active && "text-bad/80 hover:text-bad"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-panel/80 backdrop-blur-xl lg:flex">
      <div className="flex h-16 items-center border-b border-line px-5">
        <Logo href="/dashboard" />
      </div>
      <NavLinks />
      <div className="border-t border-line p-4">
        <p className="text-[11px] text-faint">
          CallOlve AI · preview build
        </p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-lg p-2 text-mute transition hover:bg-raised hover:text-fg lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-panel">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <Logo href="/dashboard" />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-mute hover:bg-raised hover:text-fg"
                aria-label="Close navigation"
              >
                <X className="size-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
