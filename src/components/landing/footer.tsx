import { Logo } from "@/components/ui/logo";

const columns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { label: "Demo", href: "#demo" },
      { label: "Features", href: "#features" },
      { label: "Use cases", href: "#use-cases" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Platform",
    links: [
      { label: "AI Assistants", href: "/signup" },
      { label: "Call Analytics", href: "/signup" },
      { label: "Integrations", href: "/signup" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Contact", href: "#contact" },
      { label: "FAQ", href: "#faq" },
      { label: "Careers", href: "#contact" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-mute">
              The operating system for voice communication. AI assistants that
              answer, act, and keep you safe.
            </p>
          </div>
          {columns.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-xs font-semibold tracking-wider text-faint uppercase">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-mute transition hover:text-fg">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-line pt-6 sm:flex-row">
          <p className="text-xs text-faint">
            © {new Date().getFullYear()} CallOlve AI. All rights reserved.
          </p>
          <p className="text-xs text-faint">Built for the future of voice.</p>
        </div>
      </div>
    </footer>
  );
}
