import { LayoutShell } from "@/components/layout/LayoutShell";
import { verifySession } from "@/lib/auth/session";
import { isEntitled } from "@/lib/auth/access";

// Free-tier pages: full dashboard chrome (Sidebar + Header), but no requireAccess()
// gate — anyone can view these without signing in or paying. Session is checked
// softly (no redirect) just so a signed-in visitor still sees their account menu.
export default async function FreeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await verifySession();
  const hideFreeBadges = await isEntitled(session);

  return (
    <div className="h-screen overflow-hidden">
      <LayoutShell email={session?.email} hideFreeBadges={hideFreeBadges}>{children}</LayoutShell>
    </div>
  );
}
