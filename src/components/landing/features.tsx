import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Bot,
  CalendarCheck,
  Languages,
  PhoneCall,
  Plug,
  ShoppingBag,
  Target,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "Natural conversations",
    text: "Context-aware, multi-turn dialogue with memory. Your assistant remembers callers, preferences, and history.",
  },
  {
    icon: PhoneCall,
    title: "Inbound & outbound",
    text: "Answer every incoming call instantly and place scheduled outbound calls — reminders, confirmations, follow-ups.",
  },
  {
    icon: CalendarCheck,
    title: "Appointment booking",
    text: "Checks availability, books, reschedules, and confirms — synced to Google, Outlook, or Apple Calendar.",
  },
  {
    icon: ShoppingBag,
    title: "Order taking",
    text: "Captures items, quantities, and delivery details with totals computed — straight into your order board.",
  },
  {
    icon: Target,
    title: "Lead qualification",
    text: "Every inquiry becomes a scored lead with intent, budget signals, and next steps for your sales team.",
  },
  {
    icon: Languages,
    title: "Multi-language",
    text: "English, Spanish, French, German, Hindi, and Portuguese — with locale-aware dates, times, and etiquette.",
  },
  {
    icon: BarChart3,
    title: "Call analytics",
    text: "Volume, conversion, sentiment, satisfaction, and revenue impact — computed from every conversation.",
  },
  {
    icon: Plug,
    title: "Deep integrations",
    text: "HubSpot, Salesforce, Zoho, calendars, WhatsApp, SMS, email — AI actions sync everywhere you work.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative scroll-mt-20 border-y border-line bg-panel/40 py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="brand" className="mb-4">Platform</Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Everything a world-class front desk does.{" "}
            <span className="text-gradient">Without the front desk.</span>
          </h2>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass group rounded-2xl p-6 transition hover:border-brand/30"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition group-hover:bg-brand/20">
                <f.icon className="size-5" />
              </span>
              <h3 className="font-display mt-4 text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-mute">{f.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
