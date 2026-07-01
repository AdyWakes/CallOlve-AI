import { Badge } from "@/components/ui/badge";
import {
  Briefcase,
  Headphones,
  Home,
  Hotel,
  Stethoscope,
  UserRound,
  UtensilsCrossed,
  Zap,
} from "lucide-react";

const cases = [
  {
    icon: UtensilsCrossed,
    title: "Restaurants",
    text: "Reservations, takeout orders, and dietary notes — even during the dinner rush when no one can reach the phone.",
    quote: "“Table for four at seven, vegetarian-friendly.” — booked in 40 seconds.",
  },
  {
    icon: Stethoscope,
    title: "Clinics",
    text: "Appointment scheduling, rescheduling, insurance FAQs, and no-show-reducing reminder calls.",
    quote: "“I need to move my Tuesday appointment.” — rescheduled, calendar synced.",
  },
  {
    icon: Home,
    title: "Real estate",
    text: "Every buyer inquiry answered, qualified by budget and area, and booked for a viewing while interest is hot.",
    quote: "“Is the 2-bedroom still available?” — lead scored 85, viewing booked.",
  },
  {
    icon: Hotel,
    title: "Hotels",
    text: "Room availability, booking changes, early check-in requests, and concierge questions in any language.",
    quote: "“¿Tienen habitaciones para este fin de semana?” — answered natively.",
  },
  {
    icon: Headphones,
    title: "Customer support",
    text: "Tier-1 resolution for order status, returns, and troubleshooting — clean escalation to humans when needed.",
    quote: "“Where is my order?” — resolved without a ticket.",
  },
  {
    icon: Briefcase,
    title: "Sales teams",
    text: "Inbound lead capture, qualification calls, and automated follow-up sequences that never go stale.",
    quote: "“Send me pricing info.” — lead captured, follow-up scheduled.",
  },
  {
    icon: Zap,
    title: "Entrepreneurs",
    text: "A full-time receptionist, scheduler, and assistant for less than the cost of an hour of your week.",
    quote: "Every missed call used to be lost revenue. Now nothing is missed.",
  },
  {
    icon: UserRound,
    title: "Personal assistant",
    text: "It calls the dentist, books the table, chases the plumber, and screens unknown numbers — on your behalf.",
    quote: "“Book me a haircut Thursday afternoon.” — done.",
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="violet" className="mb-4">Use cases</Badge>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Built for every business that{" "}
          <span className="text-gradient">lives on the phone</span>
        </h2>
      </div>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cases.map((c) => (
          <div key={c.title} className="glass flex flex-col rounded-2xl p-6 transition hover:border-violet-500/30">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
              <c.icon className="size-5" />
            </span>
            <h3 className="font-display mt-4 text-base font-semibold">{c.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-mute">{c.text}</p>
            <p className="mt-4 border-t border-line pt-3 text-xs text-faint italic">{c.quote}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
