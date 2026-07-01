import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Marco Rossi",
    role: "Owner, Bella Cucina (restaurant)",
    text: "Friday nights used to mean 20 missed calls. Now every single one is answered, and our reservation book is full before service even starts.",
  },
  {
    name: "Dr. Anjali Mehta",
    role: "Director, Lakeside Clinic",
    text: "No-shows dropped by a third once the assistant started confirming and rescheduling automatically. My front desk finally breathes.",
  },
  {
    name: "Sarah Kim",
    role: "Broker, Kim Realty Group",
    text: "It qualifies buyers while I'm in showings. I open the app and see scored leads with viewing appointments already booked.",
  },
  {
    name: "James Okafor",
    role: "Head of Support, Driftwear",
    text: "Tier-1 volume down 60%. The escalations that do reach my team arrive with a transcript, a summary, and the customer's history.",
  },
  {
    name: "Lucía Fernández",
    role: "GM, Hotel Mirador",
    text: "Guests call in Spanish, English, and French. The assistant switches languages mid-call better than most of my staff.",
  },
  {
    name: "Dev Patel",
    role: "Founder (solo)",
    text: "It's my receptionist, scheduler, and safety net. The SOS feature alone is worth it — my family has live location if anything happens.",
  },
];

export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="violet" className="mb-4">Testimonials</Badge>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Teams that stopped <span className="text-gradient">missing calls</span>
        </h2>
      </div>
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {testimonials.map((t) => (
          <figure key={t.name} className="glass flex flex-col rounded-2xl p-6">
            <div className="flex gap-0.5 text-warn" aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-3.5 fill-current" />
              ))}
            </div>
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-mute">
              “{t.text}”
            </blockquote>
            <figcaption className="mt-5 flex items-center gap-3 border-t border-line pt-4">
              <Avatar name={t.name} />
              <div>
                <p className="text-sm font-semibold text-fg">{t.name}</p>
                <p className="text-xs text-faint">{t.role}</p>
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-faint">
        Illustrative customer stories for this preview release.
      </p>
    </section>
  );
}
