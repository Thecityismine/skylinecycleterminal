import { LayoutShell } from "@/components/layout/LayoutShell";
import { verifySession } from "@/lib/auth/session";
import { isEntitled, isAdmin } from "@/lib/auth/access";

// Free-tier pages: full dashboard chrome (Sidebar + Header), but no requireAccess()
// gate — anyone can view these without signing in or paying. Session is checked
// softly (no redirect) just so a signed-in visitor still sees their account menu.
export default async function FreeLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await verifySession();
  const hideFreeBadges = await isEntitled(session);
  // Both route groups render the same Sidebar, so the admin nav has to be
  // resolved here too. Without it the ADMIN section vanishes on /dashboard and
  // the other free pages, which is where a signed-in admin usually lands.
  // verifySession() is memoized per request, so this costs nothing extra.
  const admin = await isAdmin();

  return (
    <div className="h-dvh overflow-hidden">
      <LayoutShell email={session?.email} hideFreeBadges={hideFreeBadges} isAdmin={admin}>{children}</LayoutShell>
    </div>
  );
}
