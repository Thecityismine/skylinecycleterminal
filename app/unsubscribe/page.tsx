import type { Metadata } from "next";
import { UnsubscribeForm } from "./UnsubscribeForm";

// Deliberately noindex: this URL only ever arrives by email link, and it carries
// an address in the query string.
export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; t?: string }>;
}) {
  const { e = "", t = "" } = await searchParams;

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "#070B10" }}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-7"
        style={{ backgroundColor: "var(--sct-card)", borderColor: "var(--sct-border)" }}
      >
        <UnsubscribeForm email={e} token={t} />
      </div>
    </main>
  );
}
