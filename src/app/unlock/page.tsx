import type { Metadata } from "next";
import { Logo } from "@/components/ui/logo";
import { UnlockForm } from "@/components/auth/unlock-form";

export const metadata: Metadata = {
  title: "Enter password",
  robots: { index: false, follow: false },
};

export default async function UnlockPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  return (
    <div className="bg-spotlight relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="bg-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_70%)]" />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <UnlockForm next={next} />
      </div>
    </div>
  );
}
