import { requireCurrentUser } from "@/lib/auth/current-user";
import { Sidebar } from "@/components/shell/sidebar";
import { Topbar } from "@/components/shell/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCurrentUser();

  return (
    <div className="min-h-screen">
      <Sidebar />
      <div className="lg:pl-60">
        <Topbar
          user={{
            name: user.name,
            email: user.email,
            plan: user.organization?.plan ?? "pro",
          }}
        />
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
