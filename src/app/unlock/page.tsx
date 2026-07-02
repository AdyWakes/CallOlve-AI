import type { Metadata } from "next";
import { UnlockForm } from "@/components/auth/unlock-form";

export const metadata: Metadata = {
  title: "Enter password",
  robots: { index: false, follow: false },
};

const DISPLAY = "var(--font-grotesk), var(--font-inter), ui-sans-serif, system-ui, sans-serif";
const SANS = "var(--font-inter), ui-sans-serif, system-ui, sans-serif";

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <main
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 16px",
        background: "#000000",
        color: "#ffffff",
        fontFamily: SANS,
      }}
    >
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at center, black 5%, transparent 70%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 5%, transparent 70%)",
        }}
      />
      <div style={{ position: "relative", width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                display: "inline-flex",
                width: 32,
                height: 32,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 9,
                background: "linear-gradient(135deg,#ffffff,#f2f2f2)",
                color: "#000000",
              }}
              aria-hidden
            >
              <svg viewBox="0 0 24 24" fill="none" width={20} height={20} strokeWidth={2.2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 4.5h3l1.5 4-2 1.5a11 11 0 0 0 5.5 5.5l1.5-2 4 1.5v3a1.5 1.5 0 0 1-1.5 1.5C9.6 19.5 4.5 14.4 4.5 6A1.5 1.5 0 0 1 5 4.5Z" />
                <path strokeLinecap="round" d="M14.5 5.5v3M17 4v6M19.5 5.5v3" />
              </svg>
            </span>
            <span style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 700, letterSpacing: "-.01em" }}>
              CallOlve<span style={{ color: "#c8c8cc" }}> AI</span>
            </span>
          </span>
        </div>
        <UnlockForm next={next} />
      </div>
    </main>
  );
}
