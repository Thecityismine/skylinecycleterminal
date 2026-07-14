import { LayoutShell } from "@/components/layout/LayoutShell";
import { requireAccess } from "@/lib/auth/access";
import { getStripeCustomerId } from "@/lib/auth/entitlement";

export default async function ProtectedLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await requireAccess();
  const hasBilling = (await getStripeCustomerId(session.uid)) != null;

  return (
    <div className="h-screen overflow-hidden">
      <LayoutShell email={session.email} hideFreeBadges hasBilling={hasBilling}>
        {children}
      </LayoutShell>
    </div>
  );
}
