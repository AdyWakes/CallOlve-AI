"use client";

/**
 * CallOlve AI — futuristic landing experience (design preview).
 * Self-contained client component: inline styles, cursor-glow + reveal/tilt engine,
 * prototype notice ribbon. Wired to the real /api/v1/voice/call-me endpoint.
 */

import React, { useEffect, useRef, useState } from "react";
import { apiPost, ApiClientError } from "@/lib/client";

/* ── font stacks (from next/font CSS vars set on <html> in app/layout.tsx) ── */
const DISPLAY = "var(--font-grotesk), var(--font-inter), ui-sans-serif, system-ui, sans-serif";
const SANS = "var(--font-inter), ui-sans-serif, system-ui, sans-serif";

/* ── css-string → React style object (lets us keep design styles verbatim) ── */
function s(css: string): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of css.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const rawKey = decl.slice(0, i).trim();
    const val = decl.slice(i + 1).trim();
    if (!rawKey) continue;
    const key = rawKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    out[key] = val;
  }
  return out as React.CSSProperties;
}

/* ── inline SVG icon set ── */
type IcAttrs = Record<string, string | number>;
const PATHS: Record<string, [string, IcAttrs][]> = {
  bot: [["rect", { x: 4, y: 8, width: 16, height: 12, rx: 2 }], ["path", { d: "M12 4v4" }], ["circle", { cx: 12, cy: 3, r: 1.3 }], ["circle", { cx: 9, cy: 14, r: 1.2, fill: "currentColor", stroke: "none" }], ["circle", { cx: 15, cy: 14, r: 1.2, fill: "currentColor", stroke: "none" }]],
  phoneCall: [["path", { d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.34a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0 1 22 16.92z" }], ["path", { d: "M14.05 2a9 9 0 0 1 8 7.94" }], ["path", { d: "M14.05 6A5 5 0 0 1 18 10" }]],
  calendarCheck: [["rect", { x: 3, y: 4, width: 18, height: 18, rx: 2 }], ["path", { d: "M3 10h18" }], ["path", { d: "M8 2v4" }], ["path", { d: "M16 2v4" }], ["path", { d: "m9 16 2 2 4-4" }]],
  shoppingBag: [["path", { d: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" }], ["path", { d: "M3 6h18" }], ["path", { d: "M16 10a4 4 0 0 1-8 0" }]],
  target: [["circle", { cx: 12, cy: 12, r: 10 }], ["circle", { cx: 12, cy: 12, r: 6 }], ["circle", { cx: 12, cy: 12, r: 2 }]],
  languages: [["circle", { cx: 12, cy: 12, r: 10 }], ["path", { d: "M2 12h20" }], ["path", { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" }]],
  barChart: [["path", { d: "M3 3v18h18" }], ["path", { d: "M18 17V9" }], ["path", { d: "M13 17V5" }], ["path", { d: "M8 17v-3" }]],
  plug: [["path", { d: "M12 22v-5" }], ["path", { d: "M9 8V2" }], ["path", { d: "M15 8V2" }], ["path", { d: "M6 12V8h12v4a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4z" }]],
  siren: [["path", { d: "M7 18v-6a5 5 0 0 1 10 0v6" }], ["path", { d: "M4 21h16" }], ["path", { d: "M5 21v-3" }], ["path", { d: "M19 21v-3" }]],
  utensils: [["path", { d: "M4 3v6a2 2 0 0 0 2 2 2 2 0 0 0 2-2V3" }], ["path", { d: "M6 11v10" }], ["path", { d: "M18 3v18" }], ["path", { d: "M18 9c2 0 3-1.2 3-3.5C21 3.5 19.8 2.5 18 3" }]],
  stethoscope: [["path", { d: "M5 3v6a5 5 0 0 0 10 0V3" }], ["path", { d: "M10 18a4 4 0 0 0 8 0v-3" }], ["circle", { cx: 20, cy: 13, r: 2 }]],
  home: [["path", { d: "m3 10 9-7 9 7" }], ["path", { d: "M5 9v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9" }], ["path", { d: "M9 21v-6h6v6" }]],
  hotel: [["rect", { x: 4, y: 2, width: 16, height: 20, rx: 1 }], ["path", { d: "M9 22v-4h6v4" }], ["path", { d: "M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M16 14h.01" }]],
  headphones: [["path", { d: "M3 14v-2a9 9 0 0 1 18 0v2" }], ["rect", { x: 16, y: 14, width: 5, height: 7, rx: 1.5 }], ["rect", { x: 3, y: 14, width: 5, height: 7, rx: 1.5 }]],
  briefcase: [["rect", { x: 2, y: 7, width: 20, height: 14, rx: 2 }], ["path", { d: "M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" }]],
  zap: [["polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" }]],
  userRound: [["circle", { cx: 12, cy: 8, r: 5 }], ["path", { d: "M20 21a8 8 0 0 0-16 0" }]],
  clipboardList: [["rect", { x: 8, y: 2, width: 8, height: 4, rx: 1 }], ["path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }], ["path", { d: "M8 11h8M8 15h6" }]],
  userPlus: [["circle", { cx: 9, cy: 8, r: 4 }], ["path", { d: "M2 21a7 7 0 0 1 12.7-4" }], ["path", { d: "M19 8v6" }], ["path", { d: "M22 11h-6" }]],
  messageSquare: [["path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" }]],
  sparkles: [["path", { d: "M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" }], ["path", { d: "M19 14l.7 1.9 1.9.7-1.9.7L19 19l-.7-1.7-1.9-.7 1.9-.7z" }]],
  chevronDown: [["path", { d: "m6 9 6 6 6-6" }]],
  mail: [["rect", { x: 2, y: 4, width: 20, height: 16, rx: 2 }], ["path", { d: "m22 6-10 7L2 6" }]],
  check: [["path", { d: "M20 6 9 17l-5-5" }]],
  phoneOutgoing: [["path", { d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.18 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.34a2 2 0 0 1-.45 2.11L8.1 9.9a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.74.34 1.53.57 2.34.7A2 2 0 0 1 22 16.92z" }], ["path", { d: "M15 9 22 2" }], ["path", { d: "M16 2h6v6" }]],
};

function Ic({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  const kids = (PATHS[name] || []).map((c, i) => React.createElement(c[0], { key: i, ...c[1] }));
  return React.createElement(
    "svg",
    { viewBox: "0 0 24 24", width: size, height: size, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", style: color ? { color } : undefined },
    kids
  );
}

function Star() {
  return (
    <svg viewBox="0 0 24 24" width={15} height={15} fill="#fbbf24" stroke="none">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
    </svg>
  );
}

/* ── data ── */
const NAV = [
  { href: "#try", label: "Try it live" }, { href: "#demo", label: "Demo" },
  { href: "#features", label: "Features" }, { href: "#use-cases", label: "Use cases" },
  { href: "#pricing", label: "Pricing" }, { href: "#faq", label: "FAQ" },
];
const HERO_STATS = [
  { v: "24/7", l: "always answering", count: "" },
  { v: "6", l: "languages spoken", count: "6" },
  { v: "<1s", l: "response latency", count: "" },
];
const WAVE = [38, 70, 52, 90, 64, 44, 82, 58, 96, 50, 72, 40, 86, 60, 48, 78, 56, 92, 46, 68];
const FEATURES = [
  { icon: "bot", title: "Natural conversations", text: "Context-aware, multi-turn dialogue with memory. Your assistant remembers callers, preferences, and history." },
  { icon: "phoneCall", title: "Inbound & outbound", text: "Answer every incoming call instantly and place scheduled outbound calls — reminders, confirmations, follow-ups." },
  { icon: "calendarCheck", title: "Appointment booking", text: "Checks availability, books, reschedules, and confirms — synced to Google, Outlook, or Apple Calendar." },
  { icon: "shoppingBag", title: "Order taking", text: "Captures items, quantities, and delivery details with totals computed — straight into your order board." },
  { icon: "target", title: "Lead qualification", text: "Every inquiry becomes a scored lead with intent, budget signals, and next steps for your sales team." },
  { icon: "languages", title: "Multi-language", text: "English, Spanish, French, German, Hindi, and Portuguese — with locale-aware dates, times, and etiquette." },
  { icon: "barChart", title: "Call analytics", text: "Volume, conversion, sentiment, satisfaction, and revenue impact — computed from every conversation." },
  { icon: "plug", title: "Deep integrations", text: "HubSpot, Salesforce, Zoho, calendars, WhatsApp, SMS, email — AI actions sync everywhere you work." },
];
const CASES = [
  { icon: "utensils", title: "Restaurants", text: "Reservations, takeout orders, and dietary notes — even during the dinner rush when no one can reach the phone.", quote: "\u201CTable for four at seven, vegetarian-friendly.\u201D \u2014 booked in 40 seconds." },
  { icon: "stethoscope", title: "Clinics", text: "Appointment scheduling, rescheduling, insurance FAQs, and no-show-reducing reminder calls.", quote: "\u201CI need to move my Tuesday appointment.\u201D \u2014 rescheduled, calendar synced." },
  { icon: "home", title: "Real estate", text: "Every buyer inquiry answered, qualified by budget and area, and booked for a viewing while interest is hot.", quote: "\u201CIs the 2-bedroom still available?\u201D \u2014 lead scored 85, viewing booked." },
  { icon: "hotel", title: "Hotels", text: "Room availability, booking changes, early check-in requests, and concierge questions in any language.", quote: "\u201C\u00BFTienen habitaciones para este fin de semana?\u201D \u2014 answered natively." },
  { icon: "headphones", title: "Customer support", text: "Tier-1 resolution for order status, returns, and troubleshooting — clean escalation to humans when needed.", quote: "\u201CWhere is my order?\u201D \u2014 resolved without a ticket." },
  { icon: "briefcase", title: "Sales teams", text: "Inbound lead capture, qualification calls, and automated follow-up sequences that never go stale.", quote: "\u201CSend me pricing info.\u201D \u2014 lead captured, follow-up scheduled." },
  { icon: "zap", title: "Entrepreneurs", text: "A full-time receptionist, scheduler, and assistant for less than the cost of an hour of your week.", quote: "Every missed call used to be lost revenue. Now nothing is missed." },
  { icon: "userRound", title: "Personal assistant", text: "It calls the dentist, books the table, chases the plumber, and screens unknown numbers — on your behalf.", quote: "\u201CBook me a haircut Thursday afternoon.\u201D \u2014 done." },
];
const TIERS = [
  { name: "Starter", price: "$29", period: "/month", blurb: "For solo founders and small shops getting started.", features: ["1 AI assistant", "100 calls / month", "Appointment booking", "Call summaries & transcripts", "Email support"], cta: "Start free trial", featured: false, href: "/signup" },
  { name: "Pro", price: "$99", period: "/month", blurb: "For growing businesses that run on calls.", features: ["5 AI assistants", "1,000 calls / month", "Orders, leads & full automation suite", "Analytics center", "CRM, calendar & messaging integrations", "Priority support"], cta: "Start free trial", featured: true, href: "/signup" },
  { name: "Enterprise", price: "Custom", period: "", blurb: "For teams, franchises, and call-center scale.", features: ["Unlimited assistants & volume", "Team roles & department assistants", "SSO, audit logs & security controls", "Dedicated infrastructure & SLA", "Custom integrations & onboarding"], cta: "Talk to sales", featured: false, href: "#contact" },
];
const TESTIMONIALS = [
  { name: "Marco Rossi", role: "Owner, Bella Cucina (restaurant)", initial: "M", text: "Friday nights used to mean 20 missed calls. Now every single one is answered, and our reservation book is full before service even starts." },
  { name: "Dr. Anjali Mehta", role: "Director, Lakeside Clinic", initial: "A", text: "No-shows dropped by a third once the assistant started confirming and rescheduling automatically. My front desk finally breathes." },
  { name: "Sarah Kim", role: "Broker, Kim Realty Group", initial: "S", text: "It qualifies buyers while I'm in showings. I open the app and see scored leads with viewing appointments already booked." },
  { name: "James Okafor", role: "Head of Support, Driftwear", initial: "J", text: "Tier-1 volume down 60%. The escalations that do reach my team arrive with a transcript, a summary, and the customer's history." },
  { name: "Luc\u00EDa Fern\u00E1ndez", role: "GM, Hotel Mirador", initial: "L", text: "Guests call in Spanish, English, and French. The assistant switches languages mid-call better than most of my staff." },
  { name: "Dev Patel", role: "Founder (solo)", initial: "D", text: "It's my receptionist, scheduler, and safety net. It handles every call so I never miss a customer." },
];
const FAQS = [
  { q: "How natural does the AI sound on a call?", a: "Conversations are multi-turn and context-aware: the assistant remembers what was said earlier in the call, asks only for what's missing, and confirms before acting. Voice personality, tone, and language are fully configurable per assistant." },
  { q: "How long does setup take?", a: "Minutes. Create an assistant, pick its role and personality, and test it immediately in the built-in call simulator. Connecting a real phone number is a guided step when you're ready to go live." },
  { q: "Can I keep my existing phone number?", a: "Yes. You can forward your existing number to your assistant (always, when busy, or after-hours only), or give the assistant a dedicated number and keep yours untouched." },
  { q: "What happens when the AI can't help?", a: "It escalates gracefully: transfers to a human, takes a detailed message, or schedules a callback — your choice per assistant. Every escalation arrives with the transcript and a summary, so nobody starts from zero." },
  { q: "Which languages are supported?", a: "English, Spanish, French, German, Hindi, and Portuguese at launch, with locale-aware dates, times, and phone etiquette. More languages are on the roadmap." },
  { q: "Is my call data secure?", a: "All data is encrypted in transit and at rest, scoped strictly to your account, and never used to train shared models. Enterprise plans add SSO, audit logs, retention controls, and data-residency options." },
];
const TRANSCRIPT = [
  { who: "AI", text: "Thank you for calling Bella Cucina, this is Nova. How can I help you today?" },
  { who: "Caller", text: "Hey, do you have anything free this Friday evening? We're four people." },
  { who: "AI", text: "We do — Friday I have 6:30, 7:00, or 8:15 PM for a party of four. Which works best?" },
  { who: "Caller", text: "7 is perfect. Oh, and one of us is vegetarian — is that okay?" },
  { who: "AI", text: "Not a problem at all, our menu has several vegetarian mains. I'll note it on the reservation. May I have a name and number?" },
  { who: "Caller", text: "Priya, 555-0182." },
  { who: "AI", text: "All set, Priya — Friday at 7:00 PM, four guests, vegetarian note added. You'll get a text confirmation shortly. Anything else?" },
  { who: "Caller", text: "No, that's great. Thanks!" },
];
const EXTRACTION = [
  { icon: "target", label: "Intent", value: "Book appointment — restaurant reservation" },
  { icon: "clipboardList", label: "Details captured", value: "Friday 7:00 PM · 4 guests · vegetarian note" },
  { icon: "userPlus", label: "Contact saved", value: "Priya · (555) 018-2 — added to contact book" },
  { icon: "calendarCheck", label: "Action executed", value: "Reservation created & synced to calendar" },
  { icon: "messageSquare", label: "Follow-up", value: "SMS confirmation sent automatically" },
];
const FOOTER_COLS = [
  { title: "Product", links: [{ label: "Demo", href: "#demo" }, { label: "Features", href: "#features" }, { label: "Use cases", href: "#use-cases" }, { label: "Pricing", href: "#pricing" }] },
  { title: "Platform", links: [{ label: "AI Assistants", href: "/signup" }, { label: "Call Analytics", href: "/signup" }, { label: "Integrations", href: "/signup" }] },
  { title: "Company", links: [{ label: "Contact", href: "#contact" }, { label: "FAQ", href: "#faq" }, { label: "Careers", href: "#contact" }] },
];

const KEYFRAMES = `
@keyframes ceFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
@keyframes ceWave{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
@keyframes cePing{0%{transform:scale(1);opacity:.6}75%,100%{transform:scale(2.6);opacity:0}}
@keyframes ceSpin{to{transform:rotate(360deg)}}
@keyframes ceDrift{0%{transform:translate(0,0) scale(1)}33%{transform:translate(7%,-5%) scale(1.18)}66%{transform:translate(-6%,6%) scale(.92)}100%{transform:translate(0,0) scale(1)}}
@keyframes ceScan{0%{transform:translateY(-100%)}100%{transform:translateY(100%)}}
.ce-navlink:hover{color:#ffffff !important}
.ce-details summary::-webkit-details-marker{display:none}
`;

const wordmark = (
  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
    <span style={s("display:inline-flex;width:32px;height:32px;align-items:center;justify-content:center;border-radius:9px;background:linear-gradient(135deg,#ffffff,#f2f2f2);color:#000000")} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" width={20} height={20} strokeWidth={2.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5 4.5h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.5 1.5C9.6 19.5 4.5 14.4 4.5 6A1.5 1.5 0 0 1 5 4.5Z" /><path strokeLinecap="round" d="M14.5 5.5v3M17 4v6M19.5 5.5v3" /></svg>
    </span>
    <span style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 700, letterSpacing: "-.01em" }}>CallOlve<span style={{ color: "#c8c8cc" }}> AI</span></span>
  </span>
);

export default function LandingExperience() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const mouse = useRef({ x: 0, y: 0 });
  const spot = useRef({ x: 0, y: 0 });

  // Try-it-live call form
  const [phone, setPhone] = useState("");
  const [callStatus, setCallStatus] = useState<"idle" | "calling" | "done" | "error">("idle");
  const [callError, setCallError] = useState<string | null>(null);
  // Contact form
  const [contactSent, setContactSent] = useState(false);

  async function onCallSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCallStatus("calling");
    setCallError(null);
    try {
      await apiPost("/api/v1/voice/call-me", { phone });
      setCallStatus("done");
    } catch (err) {
      setCallError(err instanceof ApiClientError ? err.message : "Could not place the call");
      setCallStatus("error");
    }
  }

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    mouse.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    spot.current = { ...mouse.current };
    let lastTilt: HTMLElement | null = null;
    let lastMag: HTMLElement | null = null;
    let raf = 0;

    const onMove = (e: PointerEvent | MouseEvent) => {
      mouse.current.x = (e as MouseEvent).clientX;
      mouse.current.y = (e as MouseEvent).clientY;
      const t = e.target as HTMLElement;
      const tilt = t?.closest?.("[data-tilt]") as HTMLElement | null;
      if (lastTilt && lastTilt !== tilt) { lastTilt.style.transform = ""; lastTilt = null; }
      if (tilt) {
        const rc = tilt.getBoundingClientRect();
        const px = (mouse.current.x - rc.left) / rc.width - 0.5;
        const py = (mouse.current.y - rc.top) / rc.height - 0.5;
        tilt.style.transform = `perspective(1000px) rotateX(${(-py * 10).toFixed(2)}deg) rotateY(${(px * 12).toFixed(2)}deg) scale(1.05)`;
        lastTilt = tilt;
      }
      const mag = t?.closest?.("[data-magnetic]") as HTMLElement | null;
      if (lastMag && lastMag !== mag) { lastMag.style.transform = ""; lastMag = null; }
      if (mag) {
        const rc = mag.getBoundingClientRect();
        const dx = (mouse.current.x - (rc.left + rc.width / 2)) * 0.32;
        const dy = (mouse.current.y - (rc.top + rc.height / 2)) * 0.32;
        mag.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`;
        lastMag = mag;
      }
    };

    const tick = () => {
      spot.current.x += (mouse.current.x - spot.current.x) * 0.16;
      spot.current.y += (mouse.current.y - spot.current.y) * 0.16;
      const g = glowRef.current;
      if (g) {
        g.style.opacity = "0.85";
        g.style.transform = `translate3d(${spot.current.x}px,${spot.current.y}px,0)`;
      }
      raf = requestAnimationFrame(tick);
    };

    const animateCount = (el: HTMLElement) => {
      const raw = el.getAttribute("data-count");
      if (!raw) return;
      const m = String(raw).match(/^([^\d]*)([\d.,]+)(.*)$/);
      if (!m) return;
      const pre = m[1] || "", suf = m[3] || "", numStr = m[2];
      const num = parseFloat(numStr.replace(/,/g, ""));
      const dec = (numStr.split(".")[1] || "").length;
      if (!isFinite(num)) return;
      const dur = 1100, start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        const v = num * e;
        el.textContent = pre + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString()) + suf;
        if (p < 1) requestAnimationFrame(step); else el.textContent = pre + numStr + suf;
      };
      requestAnimationFrame(step);
    };

    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    reveals.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
      el.style.transition = "opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)";
    });
    root.querySelectorAll<SVGPathElement>("[data-check] path").forEach((p) => {
      p.style.transition = "stroke-dashoffset .65s ease";
      p.style.strokeDashoffset = "18";
    });
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target as HTMLElement;
        const d = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);
        window.setTimeout(() => { el.style.opacity = "1"; el.style.transform = "none"; }, d);
        el.querySelectorAll<SVGPathElement>("[data-check] path").forEach((p, i) =>
          window.setTimeout(() => { p.style.strokeDashoffset = "0"; }, d + 160 + i * 90)
        );
        if (el.hasAttribute("data-count")) animateCount(el);
        io.unobserve(el);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -7% 0px" });
    reveals.forEach((el) => io.observe(el));

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
      io.disconnect();
    };
  }, []);

  const glassCard = "border-radius:18px;background:linear-gradient(160deg,rgba(26,26,30,.82),rgba(13,13,15,.72));border:1px solid #262629;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px)";
  const tiltCard = glassCard + ";transition:transform .18s ease;transform-style:preserve-3d";
  const primaryBtn = "color:#000000;background:linear-gradient(90deg,#ffffff,#f2f2f2);box-shadow:0 8px 30px -10px rgba(230,230,236,.6)";
  const headGrad = "background:linear-gradient(92deg,#ffffff,#ffffff);-webkit-background-clip:text;background-clip:text;color:transparent";

  return (
    <div ref={rootRef} style={{ ...s("position:relative;min-height:100vh;background:#000000;color:#ffffff;overflow-x:hidden;isolation:isolate"), fontFamily: SANS }}>
      <style>{KEYFRAMES}</style>

      {/* overlays */}
      <div style={s("position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.26;overflow:hidden")}>
        <div style={s("position:absolute;top:-15%;left:-5%;width:55vw;height:55vw;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.12),transparent 62%);filter:blur(44px);animation:ceDrift 22s ease-in-out infinite")} />
        <div style={s("position:absolute;top:5%;right:-10%;width:50vw;height:50vw;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.1),transparent 62%);filter:blur(48px);animation:ceDrift 28s ease-in-out infinite;animation-delay:-6s")} />
      </div>
      <div style={s("position:fixed;inset:0;pointer-events:none;z-index:0;opacity:.6;background-image:linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px);background-size:46px 46px;-webkit-mask-image:radial-gradient(ellipse at 50% 30%,#000 35%,transparent 78%);mask-image:radial-gradient(ellipse at 50% 30%,#000 35%,transparent 78%)")} />
      <div style={s("position:fixed;inset:0;pointer-events:none;z-index:1;opacity:.45;overflow:hidden;mix-blend-mode:overlay;background:repeating-linear-gradient(0deg,rgba(255,255,255,.05) 0px,rgba(255,255,255,.05) 1px,transparent 1px,transparent 4px)")}>
        <div style={s("position:absolute;left:0;right:0;height:34vh;background:linear-gradient(180deg,transparent,rgba(255,255,255,.09),transparent);animation:ceScan 7s linear infinite")} />
      </div>
      <div ref={glowRef} style={s("position:fixed;top:0;left:0;width:540px;height:540px;margin:-270px 0 0 -270px;border-radius:50%;pointer-events:none;z-index:3;opacity:0;mix-blend-mode:screen;background:radial-gradient(circle,rgba(255,255,255,.17),rgba(255,255,255,.08) 30%,rgba(255,255,255,.025) 52%,transparent 72%);transition:opacity .4s ease;will-change:transform;filter:blur(6px)")} />

      {/* prototype ribbon */}
      <div style={s("position:fixed;inset-inline:0;top:0;z-index:60;display:flex;align-items:center;justify-content:center;gap:9px;min-height:34px;padding:6px 16px;background:rgba(7,7,8,.92);border-bottom:1px solid #262629;backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);text-align:center")}>
        <span style={s("display:inline-flex;width:7px;height:7px;border-radius:50%;background:#f5b301;box-shadow:0 0 8px #f5b301;flex-shrink:0")} />
        <p style={s("margin:0;font-size:12px;line-height:1.35;color:#c8c8cc;font-weight:500")}>{"Early prototype — CallOlve AI is a design preview and not yet available for real use."}</p>
      </div>

      {/* navbar */}
      <header style={s("position:fixed;inset-inline:0;top:34px;z-index:50;border-bottom:1px solid rgba(40,40,46,.6);background:rgba(7,7,8,.7);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)")}>
        <nav style={s("margin:0 auto;max-width:1200px;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 24px")}>
          <a href="#top">{wordmark}</a>
          <div style={s("display:flex;align-items:center;gap:2px")}>
            {NAV.map((l) => (
              <a key={l.href} href={l.href} className="ce-navlink" style={s("border-radius:9px;padding:8px 12px;font-size:14px;color:#c8c8cc;transition:color .2s")}>{l.label}</a>
            ))}
          </div>
          <div style={s("display:flex;align-items:center;gap:8px")}>
            <a href="/login" style={s("border-radius:9px;padding:7px 12px;font-size:13px;color:#c8c8cc")}>Log in</a>
            <a href="/signup" data-magnetic style={s("display:inline-flex;align-items:center;border-radius:9px;padding:8px 15px;font-size:13px;font-weight:600;" + primaryBtn)}>Start free</a>
          </div>
        </nav>
      </header>

      <main id="top" style={s("position:relative;z-index:2")}>
        {/* hero */}
        <section style={s("position:relative;overflow:hidden;padding:184px 24px 80px")}>
          <div style={s("position:absolute;inset:0;pointer-events:none;background:radial-gradient(600px circle at 50% 18%,rgba(255,255,255,.08),transparent 70%)")} />
          <div style={s("position:relative;margin:0 auto;max-width:1200px;display:grid;gap:54px;align-items:center;grid-template-columns:1.05fr .95fr")}>
            <div data-reveal>
              <span style={s("display:inline-flex;align-items:center;gap:6px;border-radius:9999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#ffffff;padding:5px 12px;font-size:12px;font-weight:500;margin-bottom:20px")}><Ic name="sparkles" size={13} /> The operating system for voice communication</span>
              <h1 style={s("margin:0;font-family:" + DISPLAY + ";font-size:60px;line-height:1.06;font-weight:700;letter-spacing:-.02em")}>Delegate every call to an <span style={s(headGrad)}>AI that gets things done</span></h1>
              <p style={s("margin:22px 0 0;max-width:560px;font-size:18px;line-height:1.6;color:#c8c8cc")}>CallOlve AI answers your phone, books appointments, takes orders, qualifies leads, and resolves support questions — naturally, around the clock, in six languages. You stay focused; nothing falls through.</p>
              <div style={s("margin-top:30px;display:flex;flex-wrap:wrap;gap:12px")}>
                <a href="/signup" data-magnetic style={s("display:inline-flex;align-items:center;height:50px;padding:0 24px;border-radius:11px;font-size:16px;font-weight:600;" + primaryBtn)}>Start free — no card required</a>
                <a href="#demo" data-magnetic style={s("display:inline-flex;align-items:center;height:50px;padding:0 24px;border-radius:11px;font-size:16px;font-weight:600;color:#ffffff;border:1px solid #34343b;background:rgba(26,26,30,.6)")}>See it in action</a>
              </div>
              <dl style={s("margin:46px 0 0;display:grid;max-width:520px;grid-template-columns:repeat(3,1fr);gap:24px;border-top:1px solid #262629;padding-top:30px")}>
                {HERO_STATS.map((st) => (
                  <div key={st.l}>
                    <dd data-count={st.count} style={s("margin:0;font-family:" + DISPLAY + ";font-size:26px;font-weight:700;color:#ffffff")}>{st.v}</dd>
                    <dd style={s("margin:2px 0 0;font-size:12px;color:#6c6c74")}>{st.l}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div data-reveal data-reveal-delay="140" style={s("position:relative;margin:0 auto;width:100%;max-width:430px")}>
              <div style={s("position:absolute;inset:-1px;border-radius:26px;background:radial-gradient(130% 130% at 50% 0%,rgba(99,102,241,.3),rgba(139,92,246,.16) 45%,transparent 72%);filter:blur(16px);opacity:.7;z-index:0")} />
              <div data-tilt style={s("position:relative;z-index:1;border-radius:24px;padding:22px;background:linear-gradient(160deg,rgba(26,26,30,.86),rgba(13,13,15,.78));border:1px solid #262629;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);box-shadow:0 0 26px -6px rgba(99,102,241,.4),0 0 90px -22px rgba(139,92,246,.35);transition:transform .18s ease;transform-style:preserve-3d")}>
                <div style={s("display:flex;align-items:center;justify-content:space-between")}>
                  <div style={s("display:flex;align-items:center;gap:12px")}>
                    <span style={s("display:inline-flex;width:44px;height:44px;align-items:center;justify-content:center;border-radius:12px;background:linear-gradient(140deg,#2dd4ee,#6366f1 55%,#8b5cf6);color:#ffffff;font-family:" + DISPLAY + ";font-weight:700;font-size:16px;box-shadow:0 6px 20px -6px rgba(99,102,241,.75)")}>N</span>
                    <div>
                      <p style={s("margin:0;font-family:" + DISPLAY + ";font-size:14px;font-weight:600")}>Nova · Receptionist AI</p>
                      <p style={s("margin:2px 0 0;display:flex;align-items:center;gap:6px;font-size:12px;color:#c8c8cc")}><span style={s("position:relative;display:inline-flex;width:8px;height:8px")}><span style={s("position:absolute;inset:0;border-radius:50%;background:#22c55e;opacity:.6;animation:cePing 1.6s ease-out infinite")} /><span style={s("position:relative;width:8px;height:8px;border-radius:50%;background:#22c55e")} /></span> Live call · 00:42</p>
                    </div>
                  </div>
                  <span style={s("border-radius:9999px;border:1px solid rgba(99,102,241,.4);background:rgba(99,102,241,.16);color:#a5b4fc;padding:3px 10px;font-size:11px;font-weight:600")}>Inbound</span>
                </div>
                <div style={s("margin-top:22px;display:flex;height:56px;align-items:center;justify-content:center;gap:4px")} aria-hidden="true">
                  {WAVE.map((h, i) => (
                    <span key={i} style={{ width: 5, height: h + "%", borderRadius: 9999, background: "linear-gradient(to top,#0e7490,#2dd4ee 55%,#8b5cf6)", transformOrigin: "bottom", animation: `ceWave 1.2s ease-in-out ${(i * 0.09).toFixed(2)}s infinite` }} />
                  ))}
                </div>
                <div style={s("margin-top:18px;display:flex;flex-direction:column;gap:10px;font-size:14px")}>
                  <p style={s("margin:0;margin-left:auto;width:fit-content;max-width:85%;border-radius:16px;border-bottom-right-radius:4px;background:#1b1b1f;padding:9px 14px;color:#c8c8cc")}>Hi, can I get a table for four tomorrow around 7?</p>
                  <p style={s("margin:0;width:fit-content;max-width:85%;border-radius:16px;border-bottom-left-radius:4px;background:rgba(99,102,241,.16);border:1px solid rgba(99,102,241,.22);padding:9px 14px;color:#ffffff")}>Absolutely — tomorrow at 7:00 PM for four. May I have a name for the reservation?</p>
                </div>
                <div style={s("margin-top:18px;display:flex;flex-direction:column;gap:9px;border-top:1px solid #262629;padding-top:16px")}>
                  <p style={s("margin:0;display:flex;align-items:center;gap:9px;font-size:12px;color:#4ade80")} data-check><span style={s("display:inline-flex")}><svg viewBox="0 0 16 16" width={15} height={15} fill="none"><path d="M3.5 8.4 6.6 11.5 12.5 4.7" stroke="#22c55e" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 18 }} /></svg></span> Reservation booked · Fri 7:00 PM · 4 guests</p>
                  <p style={s("margin:0;display:flex;align-items:center;gap:9px;font-size:12px;color:#c8c8cc")}><Ic name="messageSquare" size={14} /> SMS confirmation queued</p>
                </div>
              </div>
              <div data-reveal data-reveal-delay="320" style={s("position:absolute;top:-18px;right:-14px;border-radius:13px;padding:10px 15px;background:linear-gradient(160deg,rgba(26,26,30,.92),rgba(13,13,15,.85));border:1px solid #262629;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:ceFloat 7s ease-in-out infinite")}>
                <p data-count="+38" style={s("margin:0;font-family:" + DISPLAY + ";font-size:17px;font-weight:700")}>+38</p>
                <p style={s("margin:1px 0 0;font-size:11px;color:#6c6c74")}>calls handled today</p>
              </div>
              <div data-reveal data-reveal-delay="420" style={s("position:absolute;bottom:-18px;left:-14px;border-radius:13px;padding:10px 15px;background:linear-gradient(160deg,rgba(26,26,30,.92),rgba(13,13,15,.85));border:1px solid #262629;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);animation:ceFloat 7s ease-in-out infinite;animation-delay:2s")}>
                <p style={s("margin:0;font-family:" + DISPLAY + ";font-size:17px;font-weight:700")}><span data-count="4.9">4.9</span> / 5</p>
                <p style={s("margin:1px 0 0;font-size:11px;color:#6c6c74")}>caller satisfaction</p>
              </div>
            </div>
          </div>
        </section>

        {/* try it live */}
        <section id="try" style={s("scroll-margin-top:80px;margin:0 auto;max-width:800px;padding:64px 24px")}>
          <div data-reveal data-tilt style={s("position:relative;text-align:center;padding:48px 40px;" + tiltCard + ";border-radius:26px;box-shadow:0 0 26px -6px rgba(255,255,255,.08)")}>
            <span style={s("display:inline-flex;align-items:center;gap:6px;border-radius:9999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#ffffff;padding:5px 12px;font-size:12px;font-weight:500")}><Ic name="sparkles" size={13} /> Try it live</span>
            <h2 style={s("margin:16px 0 0;font-family:" + DISPLAY + ";font-size:36px;font-weight:700;letter-spacing:-.01em")}>Get a call from our <span style={s(headGrad)}>AI receptionist</span></h2>
            <p style={s("margin:12px auto 0;max-width:470px;color:#c8c8cc;font-size:16px;line-height:1.6")}>Enter your number and Nova will call you in seconds. Try booking a table, placing an order, or asking a question — just like a real customer would.</p>
            {callStatus === "done" ? (
              <div style={s("margin:28px auto 0;max-width:470px;border-radius:18px;border:1px solid rgba(34,197,94,.3);background:rgba(34,197,94,.1);padding:26px")}>
                <Ic name="phoneCall" size={30} color="#4ade80" />
                <p style={s("margin:12px 0 0;font-family:" + DISPLAY + ";font-size:18px;font-weight:600;color:#4ade80")}>Calling you now</p>
                <p style={s("margin:6px 0 0;font-size:14px;line-height:1.55;color:#c8c8cc")}>Answer your phone — Nova is on the line. After the call, the booking and transcript appear in the dashboard.</p>
                <button onClick={() => { setCallStatus("idle"); setPhone(""); }} style={s("margin-top:16px;height:36px;padding:0 16px;border-radius:9px;font-size:13px;font-weight:600;color:#ffffff;border:1px solid #34343b;background:rgba(26,26,30,.6);cursor:pointer")}>Call another number</button>
              </div>
            ) : (
              <>
                <form onSubmit={onCallSubmit} style={s("margin:28px auto 0;display:flex;max-width:470px;gap:12px")}>
                  <input type="tel" required placeholder="+91 98XXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={callStatus === "calling"} style={s("flex:1;min-width:0;height:50px;border-radius:11px;border:1px solid #34343b;background:rgba(7,7,8,.6);color:#ffffff;padding:0 16px;font-size:15px;outline:none")} />
                  <button type="submit" data-magnetic disabled={callStatus === "calling"} style={s("display:inline-flex;align-items:center;justify-content:center;gap:8px;height:50px;padding:0 22px;border-radius:11px;font-weight:600;border:none;cursor:pointer;white-space:nowrap;" + primaryBtn)}>
                    {callStatus === "calling" ? (
                      <span style={s("display:inline-flex;align-items:center;gap:8px")}><span style={s("width:15px;height:15px;border-radius:50%;border:2px solid rgba(0,0,0,.35);border-top-color:#000;animation:ceSpin .7s linear infinite")} /> Calling…</span>
                    ) : (
                      <span style={s("display:inline-flex;align-items:center;gap:8px")}><Ic name="phoneOutgoing" size={16} /> Call me now</span>
                    )}
                  </button>
                </form>
                {callError ? (
                  <p style={s("margin:14px auto 0;max-width:470px;border-radius:10px;border:1px solid rgba(248,113,113,.3);background:rgba(248,113,113,.1);padding:8px 12px;font-size:13px;color:#fca5a5")}>{callError}</p>
                ) : (
                  <p style={s("margin:14px 0 0;font-size:12px;color:#6c6c74")}>Use international format with your country code. Your number is used only to place this demo call.</p>
                )}
              </>
            )}
          </div>
        </section>

        {/* demo */}
        <section id="demo" style={s("scroll-margin-top:80px;margin:0 auto;max-width:1200px;padding:80px 24px")}>
          <div data-reveal style={s("margin:0 auto;max-width:640px;text-align:center")}>
            <span style={s("display:inline-flex;align-items:center;gap:6px;border-radius:9999px;border:1px solid rgba(150,150,158,.25);background:rgba(150,150,158,.1);color:#ffffff;padding:5px 12px;font-size:12px;font-weight:500")}>Product demonstration</span>
            <h2 style={s("margin:16px 0 0;font-family:" + DISPLAY + ";font-size:36px;font-weight:700;letter-spacing:-.01em")}>One call. Zero human effort. <span style={s(headGrad)}>Everything handled.</span></h2>
            <p style={s("margin:14px auto 0;max-width:560px;color:#c8c8cc;font-size:16px;line-height:1.6")}>A real conversation flow from the CallOlve engine — and the structured work it produces behind the scenes. The same engine runs in your dashboard's live simulator.</p>
          </div>
          <div style={s("margin-top:54px;display:grid;gap:24px;grid-template-columns:3fr 2fr;align-items:start")}>
            <div data-reveal data-tilt style={s("padding:26px;border-radius:20px;" + tiltCard)}>
              <p style={s("margin:0 0 18px;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:#6c6c74")}>Live transcript · inbound call</p>
              <div style={s("display:flex;flex-direction:column;gap:12px")}>
                {TRANSCRIPT.map((t, i) => t.who === "AI" ? (
                  <div key={i} style={s("display:flex")}><div style={s("max-width:86%;border-radius:16px;border-bottom-left-radius:4px;background:rgba(99,102,241,.14);padding:11px 16px;font-size:14px;line-height:1.5;color:#ffffff")}><span style={s("display:block;margin-bottom:3px;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.55")}>Nova · AI</span>{t.text}</div></div>
                ) : (
                  <div key={i} style={s("display:flex;justify-content:flex-end")}><div style={s("max-width:86%;border-radius:16px;border-bottom-right-radius:4px;background:#1b1b1f;padding:11px 16px;font-size:14px;line-height:1.5;color:#c8c8cc")}><span style={s("display:block;margin-bottom:3px;font-size:10px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;opacity:.55")}>Caller</span>{t.text}</div></div>
                ))}
              </div>
            </div>
            <div data-reveal data-reveal-delay="120" data-tilt style={s("padding:26px;border-radius:20px;" + tiltCard)}>
              <p style={s("margin:0 0 18px;font-size:11px;font-weight:500;letter-spacing:.12em;text-transform:uppercase;color:#6c6c74")}>What the AI understood &amp; did</p>
              <ol style={s("margin:0;padding:0 0 0 22px;list-style:none;display:flex;flex-direction:column;gap:18px;border-left:1px solid #262629")}>
                {EXTRACTION.map((e, i) => (
                  <li key={i} style={s("position:relative")}>
                    <span style={s("position:absolute;top:2px;left:-29px;display:flex;width:16px;height:16px;align-items:center;justify-content:center;border-radius:50%;border:1px solid rgba(255,255,255,.4);background:#000")} data-check><span style={s("display:inline-flex")}><svg viewBox="0 0 16 16" width={11} height={11} fill="none"><path d="M3.4 8.2 6.4 11.2 12.4 4.6" stroke="#ffffff" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 18 }} /></svg></span></span>
                    <p style={s("margin:0;display:flex;align-items:center;gap:7px;font-size:11px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#c8c8cc")}><Ic name={e.icon} size={14} color="#ffffff" /> {e.label}</p>
                    <p style={s("margin:5px 0 0;font-size:14px;color:#ffffff")}>{e.value}</p>
                  </li>
                ))}
              </ol>
              <div style={s("margin-top:24px;border-radius:13px;border:1px solid #262629;background:rgba(13,13,15,.6);padding:16px;font-size:12px;line-height:1.6;color:#c8c8cc")}><span style={s("font-weight:600;color:#ffffff")}>Call summary · </span>Priya booked a table for 4 this Friday 7:00 PM with a vegetarian note. Confirmation sent. Sentiment: positive · CSAT 5/5.</div>
            </div>
          </div>
        </section>

        {/* features */}
        <section id="features" style={s("scroll-margin-top:80px;position:relative;border-block:1px solid #262629;background:rgba(13,13,15,.4);padding:88px 24px")}>
          <div style={s("margin:0 auto;max-width:1200px")}>
            <div data-reveal style={s("margin:0 auto;max-width:640px;text-align:center")}>
              <span style={s("display:inline-flex;align-items:center;gap:6px;border-radius:9999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#ffffff;padding:5px 12px;font-size:12px;font-weight:500")}>Platform</span>
              <h2 style={s("margin:16px 0 0;font-family:" + DISPLAY + ";font-size:36px;font-weight:700;letter-spacing:-.01em")}>Everything a world-class front desk does. <span style={s(headGrad)}>Without the front desk.</span></h2>
            </div>
            <div style={s("margin-top:54px;display:grid;gap:20px;grid-template-columns:repeat(3,1fr)")}>
              {FEATURES.map((f, i) => (
                <div key={f.title} data-reveal data-reveal-delay={i * 55} data-tilt style={s("padding:26px;" + tiltCard)}>
                  <span style={s("display:inline-flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:11px;background:rgba(255,255,255,.08);color:#ffffff")}><Ic name={f.icon} size={20} /></span>
                  <h3 style={s("margin:16px 0 0;font-family:" + DISPLAY + ";font-size:16px;font-weight:600")}>{f.title}</h3>
                  <p style={s("margin:8px 0 0;font-size:14px;line-height:1.6;color:#c8c8cc")}>{f.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* use cases */}
        <section id="use-cases" style={s("scroll-margin-top:80px;margin:0 auto;max-width:1200px;padding:88px 24px")}>
          <div data-reveal style={s("margin:0 auto;max-width:640px;text-align:center")}>
            <span style={s("display:inline-flex;align-items:center;gap:6px;border-radius:9999px;border:1px solid rgba(150,150,158,.25);background:rgba(150,150,158,.1);color:#ffffff;padding:5px 12px;font-size:12px;font-weight:500")}>Use cases</span>
            <h2 style={s("margin:16px 0 0;font-family:" + DISPLAY + ";font-size:36px;font-weight:700;letter-spacing:-.01em")}>Built for every business that <span style={s(headGrad)}>lives on the phone</span></h2>
          </div>
          <div style={s("margin-top:54px;display:grid;gap:20px;grid-template-columns:repeat(4,1fr)")}>
            {CASES.map((c, i) => (
              <div key={c.title} data-reveal data-reveal-delay={(i % 4) * 60} data-tilt style={s("display:flex;flex-direction:column;padding:24px;" + tiltCard)}>
                <span style={s("display:inline-flex;width:40px;height:40px;align-items:center;justify-content:center;border-radius:11px;background:rgba(255,255,255,.08);color:#ffffff")}><Ic name={c.icon} size={20} /></span>
                <h3 style={s("margin:16px 0 0;font-family:" + DISPLAY + ";font-size:16px;font-weight:600")}>{c.title}</h3>
                <p style={s("margin:8px 0 0;flex:1;font-size:14px;line-height:1.6;color:#c8c8cc")}>{c.text}</p>
                <p style={s("margin:16px 0 0;border-top:1px solid #262629;padding-top:12px;font-size:12px;font-style:italic;color:#6c6c74")}>{c.quote}</p>
              </div>
            ))}
          </div>
        </section>

        {/* pricing */}
        <section id="pricing" style={s("scroll-margin-top:80px;border-block:1px solid #262629;background:rgba(13,13,15,.4);padding:88px 24px")}>
          <div style={s("margin:0 auto;max-width:1200px")}>
            <div data-reveal style={s("margin:0 auto;max-width:640px;text-align:center")}>
              <span style={s("display:inline-flex;align-items:center;gap:6px;border-radius:9999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#ffffff;padding:5px 12px;font-size:12px;font-weight:500")}>Pricing</span>
              <h2 style={s("margin:16px 0 0;font-family:" + DISPLAY + ";font-size:36px;font-weight:700;letter-spacing:-.01em")}>Less than a missed customer. <span style={s(headGrad)}>Far less than a hire.</span></h2>
              <p style={s("margin:14px auto 0;max-width:520px;color:#c8c8cc;font-size:16px;line-height:1.6")}>Start free, upgrade when the calls do. Every plan includes the live call simulator and a 14-day trial.</p>
            </div>
            <div style={s("margin-top:54px;display:grid;gap:22px;grid-template-columns:repeat(3,1fr);align-items:stretch")}>
              {TIERS.map((t) => (
                <div key={t.name} data-reveal data-tilt style={s("position:relative;display:flex;flex-direction:column;padding:30px;border-radius:20px;" + tiltCard)}>
                  {t.featured && (
                    <>
                      <div style={s("position:absolute;inset:-1px;border-radius:20px;border:1px solid rgba(255,255,255,.5);box-shadow:0 0 30px -8px rgba(255,255,255,.35);pointer-events:none")} />
                      <span style={s("position:absolute;top:-12px;left:50%;transform:translateX(-50%);border-radius:9999px;background:linear-gradient(90deg,#ffffff,#f2f2f2);color:#000000;padding:3px 12px;font-size:11px;font-weight:600;white-space:nowrap")}>Most popular</span>
                    </>
                  )}
                  <h3 style={s("margin:0;font-family:" + DISPLAY + ";font-size:18px;font-weight:600")}>{t.name}</h3>
                  <p style={s("margin:6px 0 0;font-size:14px;color:#c8c8cc")}>{t.blurb}</p>
                  <p style={s("margin:20px 0 0")}><span style={s("font-family:" + DISPLAY + ";font-size:40px;font-weight:700")}>{t.price}</span><span style={s("font-size:14px;color:#6c6c74")}>{t.period}</span></p>
                  <ul style={s("margin:24px 0 0;padding:0;list-style:none;flex:1;display:flex;flex-direction:column;gap:11px")}>
                    {t.features.map((ft) => (
                      <li key={ft} style={s("display:flex;align-items:flex-start;gap:10px;font-size:14px;color:#c8c8cc")} data-check><span style={s("display:inline-flex;margin-top:1px;flex-shrink:0")}><svg viewBox="0 0 16 16" width={15} height={15} fill="none"><path d="M3.4 8.2 6.4 11.2 12.4 4.6" stroke="#ffffff" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" style={{ strokeDasharray: 18 }} /></svg></span>{ft}</li>
                    ))}
                  </ul>
                  <a href={t.href} data-magnetic style={s(t.featured ? "margin-top:26px;display:inline-flex;align-items:center;justify-content:center;height:46px;border-radius:11px;font-size:15px;font-weight:600;" + primaryBtn : "margin-top:26px;display:inline-flex;align-items:center;justify-content:center;height:46px;border-radius:11px;font-size:15px;font-weight:600;color:#ffffff;border:1px solid #34343b;background:rgba(26,26,30,.6)")}>{t.cta}</a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* testimonials */}
        <section style={s("margin:0 auto;max-width:1200px;padding:88px 24px")}>
          <div data-reveal style={s("margin:0 auto;max-width:640px;text-align:center")}>
            <span style={s("display:inline-flex;align-items:center;gap:6px;border-radius:9999px;border:1px solid rgba(150,150,158,.25);background:rgba(150,150,158,.1);color:#ffffff;padding:5px 12px;font-size:12px;font-weight:500")}>Testimonials</span>
            <h2 style={s("margin:16px 0 0;font-family:" + DISPLAY + ";font-size:36px;font-weight:700;letter-spacing:-.01em")}>Teams that stopped <span style={s(headGrad)}>missing calls</span></h2>
          </div>
          <div style={s("margin-top:54px;display:grid;gap:20px;grid-template-columns:repeat(3,1fr)")}>
            {TESTIMONIALS.map((t, i) => (
              <figure key={t.name} data-reveal data-reveal-delay={(i % 3) * 70} data-tilt style={s("margin:0;display:flex;flex-direction:column;padding:26px;" + tiltCard)}>
                <div style={s("display:flex;gap:2px")}><Star /><Star /><Star /><Star /><Star /></div>
                <blockquote style={s("margin:16px 0 0;flex:1;font-size:14px;line-height:1.65;color:#c8c8cc")}>{"\u201C" + t.text + "\u201D"}</blockquote>
                <figcaption style={s("margin:20px 0 0;display:flex;align-items:center;gap:12px;border-top:1px solid #262629;padding-top:16px")}>
                  <span style={s("display:inline-flex;width:38px;height:38px;align-items:center;justify-content:center;border-radius:10px;background:linear-gradient(135deg,#ffffff,#f2f2f2);color:#000000;font-family:" + DISPLAY + ";font-weight:700;font-size:15px")}>{t.initial}</span>
                  <div><p style={s("margin:0;font-size:14px;font-weight:600;color:#ffffff")}>{t.name}</p><p style={s("margin:1px 0 0;font-size:12px;color:#6c6c74")}>{t.role}</p></div>
                </figcaption>
              </figure>
            ))}
          </div>
          <p style={s("margin:28px 0 0;text-align:center;font-size:12px;color:#6c6c74")}>Illustrative customer stories for this preview release.</p>
        </section>

        {/* faq */}
        <section id="faq" style={s("scroll-margin-top:80px;margin:0 auto;max-width:780px;padding:88px 24px")}>
          <div data-reveal style={s("text-align:center")}>
            <span style={s("display:inline-flex;align-items:center;gap:6px;border-radius:9999px;border:1px solid rgba(255,255,255,.22);background:rgba(255,255,255,.08);color:#ffffff;padding:5px 12px;font-size:12px;font-weight:500")}>FAQ</span>
            <h2 style={s("margin:16px 0 0;font-family:" + DISPLAY + ";font-size:36px;font-weight:700;letter-spacing:-.01em")}>Questions, <span style={s(headGrad)}>answered</span></h2>
          </div>
          <div style={s("margin-top:44px;display:flex;flex-direction:column;gap:12px")}>
            {FAQS.map((f) => (
              <details key={f.q} className="ce-details" data-reveal style={s("border-radius:14px;padding:0 20px;" + glassCard)}>
                <summary style={s("display:flex;cursor:pointer;list-style:none;align-items:center;justify-content:space-between;gap:16px;padding:16px 0;font-size:15px;font-weight:500;color:#ffffff")}>{f.q}<span style={s("color:#6c6c74;flex-shrink:0;display:inline-flex")}><Ic name="chevronDown" size={16} /></span></summary>
                <p style={s("margin:0;padding:0 0 18px;font-size:14px;line-height:1.65;color:#c8c8cc")}>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* contact */}
        <section id="contact" style={s("scroll-margin-top:80px;border-top:1px solid #262629;background:rgba(13,13,15,.4);padding:88px 24px")}>
          <div style={s("margin:0 auto;max-width:1200px;display:grid;gap:54px;grid-template-columns:1fr 1fr;align-items:center")}>
            <div data-reveal>
              <span style={s("display:inline-flex;align-items:center;gap:6px;border-radius:9999px;border:1px solid rgba(150,150,158,.25);background:rgba(150,150,158,.1);color:#ffffff;padding:5px 12px;font-size:12px;font-weight:500")}>Contact</span>
              <h2 style={s("margin:16px 0 0;font-family:" + DISPLAY + ";font-size:36px;font-weight:700;letter-spacing:-.01em")}>Ready to put your phone <span style={s(headGrad)}>on autopilot?</span></h2>
              <p style={s("margin:16px 0 0;max-width:440px;font-size:16px;line-height:1.6;color:#c8c8cc")}>Tell us about your business and call volume — we'll show you exactly what CallOlve AI can take off your plate. Enterprise teams get a tailored onboarding plan.</p>
              <a href="/signup" data-magnetic style={s("margin-top:28px;display:inline-flex;align-items:center;height:50px;padding:0 24px;border-radius:11px;font-size:16px;font-weight:600;" + primaryBtn)}>Start free instead</a>
              <p style={s("margin:28px 0 0;display:flex;align-items:center;gap:8px;font-size:14px;color:#6c6c74")}><Ic name="mail" size={16} /> hello@callolve.ai</p>
            </div>
            <div data-reveal data-reveal-delay="120" data-tilt style={s("padding:30px;border-radius:20px;" + tiltCard)}>
              {contactSent ? (
                <div style={s("display:flex;min-height:300px;flex-direction:column;align-items:center;justify-content:center;text-align:center")}>
                  <span style={s("display:flex;width:48px;height:48px;align-items:center;justify-content:center;border-radius:50%;background:rgba(34,197,94,.1);color:#4ade80")}><Ic name="check" size={24} /></span>
                  <h3 style={s("margin:16px 0 0;font-family:" + DISPLAY + ";font-size:18px;font-weight:600")}>Message received</h3>
                  <p style={s("margin:6px 0 0;max-width:280px;font-size:14px;line-height:1.55;color:#c8c8cc")}>Thanks for reaching out — our team will get back to you within one business day.</p>
                </div>
              ) : (
                <form onSubmit={(e) => { e.preventDefault(); setContactSent(true); }} style={s("display:flex;flex-direction:column;gap:16px")}>
                  <div style={s("display:grid;gap:16px;grid-template-columns:1fr 1fr")}>
                    <label style={s("display:flex;flex-direction:column;gap:7px;font-size:13px;color:#c8c8cc")}>Name<input required placeholder="Alex Carter" style={s("height:44px;border-radius:10px;border:1px solid #34343b;background:rgba(7,7,8,.6);color:#ffffff;padding:0 14px;font-size:14px;outline:none")} /></label>
                    <label style={s("display:flex;flex-direction:column;gap:7px;font-size:13px;color:#c8c8cc")}>Work email<input type="email" required placeholder="alex@company.com" style={s("height:44px;border-radius:10px;border:1px solid #34343b;background:rgba(7,7,8,.6);color:#ffffff;padding:0 14px;font-size:14px;outline:none")} /></label>
                  </div>
                  <label style={s("display:flex;flex-direction:column;gap:7px;font-size:13px;color:#c8c8cc")}>Company (optional)<input placeholder="Acme Dental" style={s("height:44px;border-radius:10px;border:1px solid #34343b;background:rgba(7,7,8,.6);color:#ffffff;padding:0 14px;font-size:14px;outline:none")} /></label>
                  <label style={s("display:flex;flex-direction:column;gap:7px;font-size:13px;color:#c8c8cc")}>What do you want your AI to handle?<textarea required rows={3} placeholder="We miss ~30 booking calls a week after hours…" style={s("border-radius:10px;border:1px solid #34343b;background:rgba(7,7,8,.6);color:#ffffff;padding:12px 14px;font-size:14px;outline:none;resize:vertical;font-family:" + SANS)} /></label>
                  <button type="submit" style={s("height:48px;border-radius:11px;font-size:15px;font-weight:600;border:none;cursor:pointer;" + primaryBtn)}>Request a demo</button>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* footer */}
      <footer style={s("position:relative;z-index:2;border-top:1px solid #262629")}>
        <div style={s("margin:0 auto;max-width:1200px;padding:56px 24px")}>
          <div style={s("display:grid;gap:40px;grid-template-columns:2fr 1fr 1fr 1fr")}>
            <div>
              <a href="#top">{wordmark}</a>
              <p style={s("margin:16px 0 0;max-width:280px;font-size:14px;line-height:1.6;color:#c8c8cc")}>The operating system for voice communication. AI assistants that answer, act, and keep you safe.</p>
            </div>
            {FOOTER_COLS.map((col) => (
              <nav key={col.title}>
                <h3 style={s("margin:0;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#6c6c74")}>{col.title}</h3>
                <ul style={s("margin:16px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px")}>
                  {col.links.map((lk) => (
                    <li key={lk.label}><a href={lk.href} className="ce-navlink" style={s("font-size:14px;color:#c8c8cc;transition:color .2s")}>{lk.label}</a></li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div style={s("margin-top:46px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;border-top:1px solid #262629;padding-top:24px")}>
            <p style={s("margin:0;font-size:12px;color:#6c6c74")}>© 2026 CallOlve AI. All rights reserved.</p>
            <p style={s("margin:0;font-size:12px;color:#6c6c74")}>Built for the future of voice.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}