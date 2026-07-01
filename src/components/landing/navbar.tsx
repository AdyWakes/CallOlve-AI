import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/button";

const links = [
  { href: "#try", label: "Try it live" },
  { href: "#demo", label: "Demo" },
  { href: "#features", label: "Features" },
  { href: "#use-cases", label: "Use cases" },
  { href: "#pricing", label: "Pricing" },
  { href: "#faq", label: "FAQ" },
];

export function Navbar() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-line/60 bg-bg/70 backdrop-blur-xl">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-sm text-mute transition hover:bg-raised/60 hover:text-fg"
            >
              {l.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink href="/login" variant="ghost" size="sm">
            Log in
          </ButtonLink>
          <ButtonLink href="/signup" size="sm">
            Start free
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}
