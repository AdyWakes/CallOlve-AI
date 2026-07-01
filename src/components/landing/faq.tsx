import { Badge } from "@/components/ui/badge";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How natural does the AI sound on a call?",
    a: "Conversations are multi-turn and context-aware: the assistant remembers what was said earlier in the call, asks only for what's missing, and confirms before acting. Voice personality, tone, and language are fully configurable per assistant.",
  },
  {
    q: "How long does setup take?",
    a: "Minutes. Create an assistant, pick its role and personality, and test it immediately in the built-in call simulator. Connecting a real phone number is a guided step when you're ready to go live.",
  },
  {
    q: "Can I keep my existing phone number?",
    a: "Yes. You can forward your existing number to your assistant (always, when busy, or after-hours only), or give the assistant a dedicated number and keep yours untouched.",
  },
  {
    q: "What happens when the AI can't help?",
    a: "It escalates gracefully: transfers to a human, takes a detailed message, or schedules a callback — your choice per assistant. Every escalation arrives with the transcript and a summary, so nobody starts from zero.",
  },
  {
    q: "Which languages are supported?",
    a: "English, Spanish, French, German, Hindi, and Portuguese at launch, with locale-aware dates, times, and phone etiquette. More languages are on the roadmap.",
  },
  {
    q: "Is my call data secure?",
    a: "All data is encrypted in transit and at rest, scoped strictly to your account, and never used to train shared models. Enterprise plans add SSO, audit logs, retention controls, and data-residency options.",
  },
  {
    q: "How does the SOS emergency module work?",
    a: "A triple press of the power button (or a wearable / voice trigger) starts an emergency event: your live location is shared, emergency contacts are alerted by SMS and AI call in priority order, and audio/video evidence can be captured — all recorded on a tamper-evident timeline.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="text-center">
        <Badge variant="brand" className="mb-4">FAQ</Badge>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Questions, <span className="text-gradient">answered</span>
        </h2>
      </div>
      <div className="mt-12 space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="glass group rounded-xl px-5 open:border-brand/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="size-4 shrink-0 text-faint transition group-open:rotate-180" />
            </summary>
            <p className="pb-5 text-sm leading-relaxed text-mute">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
