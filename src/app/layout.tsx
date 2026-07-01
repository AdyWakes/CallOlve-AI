import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CallOlve AI — The Operating System for Voice Communication",
    template: "%s · CallOlve AI",
  },
  description:
    "Delegate your phone calls to AI assistants that book appointments, take orders, qualify leads, and support customers — 24/7, in any language.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
