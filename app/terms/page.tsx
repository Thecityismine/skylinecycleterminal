import Link from "next/link";

const EFFECTIVE_DATE = "July 13, 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-base font-semibold mb-2" style={{ color: "var(--sct-text)" }}>{title}</h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: "var(--sct-secondary)" }}>
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 py-16" style={{ backgroundColor: "var(--sct-bg)" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--sct-text)" }}>Terms of Service</h1>
        <p className="text-xs mb-8" style={{ color: "var(--sct-muted)" }}>Effective {EFFECTIVE_DATE}</p>

        <div
          className="rounded-xl border px-5 py-4 mb-8 text-xs leading-relaxed"
          style={{ backgroundColor: "rgba(230,180,80,0.08)", borderColor: "rgba(230,180,80,0.3)", color: "var(--sct-amber)" }}
        >
          Draft template — not yet reviewed by a lawyer. Governing-law jurisdiction and the legal
          entity name below are placeholders pending business registration; replace before treating
          this as final.
        </div>

        <Section title="1. Acceptance of terms">
          <p>
            By creating an account or using Skyline Cycle Terminal (&quot;the Service&quot;, &quot;we&quot;, &quot;us&quot;), you agree to
            these Terms of Service. If you do not agree, do not use the Service.
          </p>
        </Section>

        <Section title="2. What the Service is">
          <p>
            Skyline Cycle Terminal provides charts, indicators, and market-cycle analysis for Bitcoin,
            Ethereum, and related assets, built from third-party data sources (including CoinGecko,
            CoinMetrics, FRED, and others).
          </p>
          <p>
            Nothing on the Service is financial, investment, tax, or legal advice, and no content
            constitutes a recommendation to buy, sell, or hold any asset. Market data may be delayed,
            estimated, or sourced from third parties we don&apos;t control, and may contain errors. You are
            solely responsible for any decisions made using the Service, and we are not liable for any
            trading or investment losses arising from your use of it.
          </p>
        </Section>

        <Section title="3. Accounts">
          <p>
            You must be at least 18 years old to create an account. You&apos;re responsible for maintaining
            the security of your account and for all activity under it. Sign-in is provided via Google
            OAuth or an emailed sign-in link — you&apos;re responsible for the security of the associated
            email/Google account.
          </p>
        </Section>

        <Section title="4. Subscriptions & billing">
          <p>
            The Service is offered as a $99/year subscription, billed in advance and processed by
            Stripe. Your subscription automatically renews at the then-current price each year unless
            you cancel before the renewal date.
          </p>
          <p>
            You can cancel at any time; cancelling stops future renewals but does not refund the
            current billing period. Fees already paid are non-refundable except where required by law.
            If a renewal payment fails, we may suspend access until payment succeeds or the
            subscription is cancelled.
          </p>
        </Section>

        <Section title="5. Acceptable use">
          <p>
            You agree not to: resell, sublicense, or redistribute Service content without permission;
            attempt to circumvent the subscription paywall; scrape or bulk-extract data from the
            Service; reverse-engineer the Service; or use the Service for any unlawful purpose.
          </p>
        </Section>

        <Section title="6. Intellectual property">
          <p>
            The Service, including its design, indicators, scoring methodology, and branding, is our
            property or licensed to us. Your subscription grants you a personal, non-transferable
            license to use the Service — it does not transfer ownership of any of it to you.
          </p>
        </Section>

        <Section title="7. Disclaimers & limitation of liability">
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available,&quot; without warranties of any kind, express
            or implied, including fitness for a particular purpose, accuracy, or uninterrupted
            availability.
          </p>
          <p>
            To the maximum extent permitted by law, we are not liable for any indirect, incidental, or
            consequential damages, or for any trading/investment losses, arising from your use of the
            Service. Our total liability for any claim relating to the Service is limited to the amount
            you paid us in the 12 months before the claim arose.
          </p>
        </Section>

        <Section title="8. Termination">
          <p>
            We may suspend or terminate your access if you violate these terms, misuse the Service, or
            fail to pay applicable fees. You may stop using the Service and cancel your subscription at
            any time.
          </p>
        </Section>

        <Section title="9. Changes to these terms">
          <p>
            We may update these terms from time to time. Continued use of the Service after a change
            takes effect constitutes acceptance of the revised terms. Material changes will be
            reflected by updating the effective date above.
          </p>
        </Section>

        <Section title="10. Governing law">
          <p>
            These terms are governed by the laws of [Your State/Country], without regard to conflict-of-law
            principles.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            Questions about these terms? <Link href="/contact" style={{ color: "var(--sct-btc)" }}>Contact us</Link>.
          </p>
        </Section>

        <Link href="/" className="text-sm" style={{ color: "var(--sct-btc)" }}>&larr; Back to home</Link>
      </div>
    </div>
  );
}
