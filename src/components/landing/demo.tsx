import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CalendarCheck, ClipboardList, MessageSquare, Target, UserPlus } from "lucide-react";

const transcript: { speaker: "AI" | "Caller"; text: string }[] = [
  { speaker: "AI", text: "Thank you for calling Bella Cucina, this is Nova. How can I help you today?" },
  { speaker: "Caller", text: "Hey, do you have anything free this Friday evening? We're four people." },
  { speaker: "AI", text: "We do — Friday I have 6:30, 7:00, or 8:15 PM for a party of four. Which works best?" },
  { speaker: "Caller", text: "7 is perfect. Oh, and one of us is vegetarian — is that okay?" },
  { speaker: "AI", text: "Not a problem at all, our menu has several vegetarian mains. I'll note it on the reservation. May I have a name and number?" },
  { speaker: "Caller", text: "Priya, 555-0182." },
  { speaker: "AI", text: "All set, Priya — Friday at 7:00 PM, four guests, vegetarian note added. You'll get a text confirmation shortly. Anything else?" },
  { speaker: "Caller", text: "No, that's great. Thanks!" },
];

const extraction = [
  { icon: Target, label: "Intent", value: "Book appointment — restaurant reservation" },
  { icon: ClipboardList, label: "Details captured", value: "Friday 7:00 PM · 4 guests · vegetarian note" },
  { icon: UserPlus, label: "Contact saved", value: "Priya · (555) 018-2 — added to contact book" },
  { icon: CalendarCheck, label: "Action executed", value: "Reservation created & synced to calendar" },
  { icon: MessageSquare, label: "Follow-up", value: "SMS confirmation sent automatically" },
];

export function Demo() {
  return (
    <section id="demo" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <Badge variant="violet" className="mb-4">Product demonstration</Badge>
        <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
          One call. Zero human effort.{" "}
          <span className="text-gradient">Everything handled.</span>
        </h2>
        <p className="mt-4 text-mute">
          A real conversation flow from the CallOlve engine — and the structured
          work it produces behind the scenes. The same engine runs in your
          dashboard&apos;s live simulator.
        </p>
      </div>

      <div className="mt-14 grid gap-6 lg:grid-cols-5">
        {/* Transcript */}
        <Card className="p-6 lg:col-span-3">
          <p className="mb-4 text-xs font-medium tracking-wide text-faint uppercase">
            Live transcript · inbound call
          </p>
          <div className="space-y-3">
            {transcript.map((t, i) => (
              <div key={i} className={t.speaker === "Caller" ? "flex justify-end" : "flex"}>
                <div
                  className={
                    t.speaker === "Caller"
                      ? "max-w-[85%] rounded-2xl rounded-br-sm bg-raised px-4 py-2.5 text-sm text-mute"
                      : "max-w-[85%] rounded-2xl rounded-bl-sm bg-brand/10 px-4 py-2.5 text-sm text-fg"
                  }
                >
                  <span className="mb-0.5 block text-[10px] font-semibold tracking-wide uppercase opacity-60">
                    {t.speaker === "AI" ? "Nova · AI" : "Caller"}
                  </span>
                  {t.text}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Structured output */}
        <Card className="p-6 lg:col-span-2">
          <p className="mb-4 text-xs font-medium tracking-wide text-faint uppercase">
            What the AI understood &amp; did
          </p>
          <ol className="relative space-y-5 border-l border-line pl-5">
            {extraction.map((e) => (
              <li key={e.label} className="relative">
                <span className="absolute top-0.5 -left-[27px] flex size-4 items-center justify-center rounded-full border border-brand/40 bg-bg">
                  <span className="size-1.5 rounded-full bg-brand" />
                </span>
                <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-mute uppercase">
                  <e.icon className="size-3.5 text-brand" /> {e.label}
                </p>
                <p className="mt-1 text-sm text-fg">{e.value}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 rounded-xl border border-line bg-panel p-4 text-xs text-mute">
            <span className="font-semibold text-fg">Call summary · </span>
            Priya booked a table for 4 this Friday 7:00 PM with a vegetarian
            note. Confirmation sent. Sentiment: positive · CSAT 5/5.
          </div>
        </Card>
      </div>
    </section>
  );
}
