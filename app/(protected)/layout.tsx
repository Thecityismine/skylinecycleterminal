import { LayoutShell } from "@/components/layout/LayoutShell";
import { requireAccess, isAdmin } from "@/lib/auth/access";
import { getStripeCustomerId } from "@/lib/auth/entitlement";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAccess();
  const hasBilling = (await getStripeCustomerId(session.uid)) != null;
  const admin = await isAdmin();

  return (
    <div className="h-screen overflow-hidden">
      <LayoutShell email={session.email} hideFreeBadges hasBilling={hasBilling} isAdmin={admin}>
        {children}
      </LayoutShell>
    </div>
  );
}
