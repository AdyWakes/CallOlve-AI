"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/misc";
import { Badge } from "@/components/ui/badge";
import { MobileNav } from "./sidebar";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";

export function Topbar({
  user,
}: {
  user: { name: string; email: string; plan: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <MobileNav />
        <Badge variant="brand" className="hidden sm:inline-flex">
          {user.plan === "enterprise" ? "Enterprise" : user.plan === "pro" ? "Pro plan" : "Trial"}
        </Badge>
      </div>

      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-raised/70"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <Avatar name={user.name} className="size-8" color="#22d3ee" />
          <span className="hidden text-left sm:block">
            <span className="block text-sm font-medium text-fg">{user.name}</span>
            <span className="block text-xs text-faint">{user.email}</span>
          </span>
          <ChevronDown className="size-4 text-faint" />
        </button>

        {open ? (
          <div
            role="menu"
            className="glass absolute right-0 mt-2 w-52 overflow-hidden rounded-xl py-1.5 shadow-2xl"
          >
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-mute transition hover:bg-raised/70 hover:text-fg"
            >
              <UserRound className="size-4" /> Profile
            </Link>
            <Link
              href="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-mute transition hover:bg-raised/70 hover:text-fg"
            >
              <Settings className="size-4" /> Settings
            </Link>
            <div className="my-1.5 border-t border-line" />
            <button
              type="button"
              role="menuitem"
              onClick={logout}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-bad transition hover:bg-bad/10"
            >
              <LogOut className="size-4" /> Log out
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
