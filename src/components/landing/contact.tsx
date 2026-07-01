"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Check, Mail } from "lucide-react";

export function Contact() {
  const [sent, setSent] = useState(false);

  return (
    <section id="contact" className="scroll-mt-20 border-t border-line bg-panel/40 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <Badge variant="violet" className="mb-4">Contact</Badge>
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to put your phone{" "}
            <span className="text-gradient">on autopilot?</span>
          </h2>
          <p className="mt-4 max-w-md text-mute">
            Tell us about your business and call volume — we&apos;ll show you
            exactly what CallOlve AI can take off your plate. Enterprise teams
            get a tailored onboarding plan.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup" size="lg">Start free instead</ButtonLink>
          </div>
          <p className="mt-8 flex items-center gap-2 text-sm text-faint">
            <Mail className="size-4" /> hello@callease.ai
          </p>
        </div>

        <div className="glass rounded-2xl p-7">
          {sent ? (
            <div className="flex h-full min-h-72 flex-col items-center justify-center text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-ok/10 text-ok">
                <Check className="size-6" />
              </span>
              <h3 className="font-display mt-4 text-lg font-semibold">Message received</h3>
              <p className="mt-1 max-w-xs text-sm text-mute">
                Thanks for reaching out — our team will get back to you within
                one business day.
              </p>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setSent(true);
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Name">
                  {(id) => <Input id={id} name="name" required placeholder="Alex Carter" />}
                </Field>
                <Field label="Work email">
                  {(id) => (
                    <Input id={id} name="email" type="email" required placeholder="alex@company.com" />
                  )}
                </Field>
              </div>
              <Field label="Company (optional)">
                {(id) => <Input id={id} name="company" placeholder="Acme Dental" />}
              </Field>
              <Field label="What do you want your AI to handle?">
                {(id) => (
                  <Textarea
                    id={id}
                    name="message"
                    required
                    placeholder="We miss ~30 booking calls a week after hours…"
                  />
                )}
              </Field>
              <Button type="submit" className="w-full">Request a demo</Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
