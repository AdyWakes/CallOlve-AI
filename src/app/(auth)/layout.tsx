import { Logo } from "@/components/ui/logo";
import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-spotlight relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        {children}
        <p className="mt-8 text-center text-xs text-faint">
          <Link href="/" className="transition hover:text-mute">
            ← Back to callease.ai
          </Link>
        </p>
      </div>
    </div>
  );
}
