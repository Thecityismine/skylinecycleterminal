import { LayoutShell } from "@/components/layout/LayoutShell";
import { requireAccess } from "@/lib/auth/access";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAccess();

  return (
    <div className="h-screen overflow-hidden">
      <LayoutShell email={session.email} hideFreeBadges>{children}</LayoutShell>
    </div>
  );
}
