import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

const tiers = [
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    blurb: "For solo founders and small shops getting started.",
    features: [
      "1 AI assistant",
      "100 calls / month",
      "Appointment booking",
      "Call summaries & transcripts",
      "Email support",
    ],
    cta: "Start free trial",
    featured: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    blurb: "For growing businesses that run on calls.",
    features: [
      "5 AI assistants",
      "1,000 calls / month",
      "Orders, leads & full automation suite",
      "Analytics center",
      "CRM, calendar & messaging integrations",
      "SOS emergency module",
      "Priority support",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    blurb: "For teams, franchises, and call-center scale.",
    features: [
      "Unlimited assistants & volume",
      "Team roles & department assistants",
      "SSO, audit logs & security controls",
      "Dedicated infrastructure & SLA",
      "Custom integrations & onboarding",
    ],
    cta: "Talk to sales",
    featured: false,
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="scroll-mt-20 border-y border-line bg-panel/40 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="brand" className="mb-4">Pricing</Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Less than a missed customer.{" "}
            <span className="text-gradient">Far less than a hire.</span>
          </h2>
          <p className="mt-4 text-mute">
            Start free, upgrade when the calls do. Every plan includes the live
            call simulator and a 14-day trial.
          </p>
        </div>

        <div className="mt-14 grid items-stretch gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={cn(
                "glass relative flex flex-col rounded-2xl p-7",
                t.featured && "glow-brand border-brand/40"
              )}
            >
              {t.featured && (
                <Badge variant="brand" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most popular
                </Badge>
              )}
              <h3 className="font-display text-lg font-semibold">{t.name}</h3>
              <p className="mt-1 text-sm text-mute">{t.blurb}</p>
              <p className="mt-5">
                <span className="font-display text-4xl font-bold">{t.price}</span>
                <span className="text-sm text-faint">{t.period}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-mute">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                    {f}
                  </li>
                ))}
              </ul>
              <ButtonLink
                href={t.name === "Enterprise" ? "#contact" : "/signup"}
                variant={t.featured ? "primary" : "secondary"}
                className="mt-7 w-full"
              >
                {t.cta}
              </ButtonLink>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
