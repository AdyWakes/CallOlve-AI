import { ButtonLink } from "@/components/ui/button";
import { Badge, LiveDot } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/misc";
import { CalendarCheck, MessageSquare, Sparkles } from "lucide-react";

const WAVE_BARS = [38, 70, 52, 90, 64, 44, 82, 58, 96, 50, 72, 40, 86, 60, 48, 78, 56, 92, 46, 68];

export function Hero() {
  return (
    <section className="bg-spotlight relative overflow-hidden pt-32 pb-20 sm:pt-40">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        {/* Copy */}
        <div className="animate-fade-up">
          <Badge variant="brand" className="mb-5">
            <Sparkles className="size-3" />
            The operating system for voice communication
          </Badge>
          <h1 className="font-display text-4xl leading-[1.08] font-bold tracking-tight sm:text-6xl">
            Delegate every call to an{" "}
            <span className="text-gradient">AI that gets things done</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-mute">
            CallOlve AI answers your phone, books appointments, takes orders,
            qualifies leads, and resolves support questions — naturally,
            around the clock, in six languages. You stay focused; nothing
            falls through.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/signup" size="lg">
              Start free — no card required
            </ButtonLink>
            <ButtonLink href="#demo" variant="secondary" size="lg">
              See it in action
            </ButtonLink>
          </div>
          <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-8">
            {[
              ["24/7", "always answering"],
              ["6", "languages spoken"],
              ["<1s", "response latency"],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-2xl font-bold text-fg">{v}</dd>
                <dd className="text-xs text-faint">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Live call visual */}
        <div className="relative mx-auto w-full max-w-md animate-fade-up [animation-delay:150ms]">
          <div className="glass glow-brand rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar name="Nova" color="#22d3ee" className="size-11" />
                <div>
                  <p className="font-display text-sm font-semibold">Nova · Receptionist AI</p>
                  <p className="flex items-center gap-1.5 text-xs text-mute">
                    <LiveDot /> Live call · 00:42
                  </p>
                </div>
              </div>
              <Badge variant="ok">Inbound</Badge>
            </div>

            {/* Waveform */}
            <div className="mt-6 flex h-14 items-center justify-center gap-1" aria-hidden>
              {WAVE_BARS.map((h, i) => (
                <span
                  key={i}
                  className="w-1.5 animate-wave rounded-full bg-gradient-to-t from-cyan-500 to-violet-400"
                  style={{ height: `${h}%`, animationDelay: `${i * 90}ms` }}
                />
              ))}
            </div>

            {/* Transcript snippet */}
            <div className="mt-5 space-y-2.5 text-sm">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-raised px-3.5 py-2 text-mute">
                Hi, can I get a table for four tomorrow around 7?
              </p>
              <p className="w-fit max-w-[85%] rounded-2xl rounded-bl-sm bg-brand/10 px-3.5 py-2 text-fg">
                Absolutely — tomorrow at 7:00 PM for four. May I have a name
                for the reservation?
              </p>
            </div>

            {/* Executed actions */}
            <div className="mt-5 space-y-2 border-t border-line pt-4">
              <p className="flex items-center gap-2 text-xs text-ok">
                <CalendarCheck className="size-3.5" /> Reservation booked · Fri 7:00 PM · 4 guests
              </p>
              <p className="flex items-center gap-2 text-xs text-mute">
                <MessageSquare className="size-3.5" /> SMS confirmation queued
              </p>
            </div>
          </div>

          {/* Floating stat chips */}
          <div className="glass absolute -top-5 -right-3 animate-float rounded-xl px-4 py-2.5 text-xs sm:-right-8">
            <p className="font-display text-base font-bold text-fg">+38</p>
            <p className="text-faint">calls handled today</p>
          </div>
          <div className="glass absolute -bottom-5 -left-3 animate-float rounded-xl px-4 py-2.5 text-xs [animation-delay:2s] sm:-left-8">
            <p className="font-display text-base font-bold text-fg">4.9 / 5</p>
            <p className="text-faint">caller satisfaction</p>
          </div>
        </div>
      </div>
    </section>
  );
}
