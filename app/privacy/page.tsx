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

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-16" style={{ backgroundColor: "var(--sct-bg)" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--sct-text)" }}>Privacy Policy</h1>
        <p className="text-xs mb-8" style={{ color: "var(--sct-muted)" }}>Effective {EFFECTIVE_DATE}</p>

        <div
          className="rounded-xl border px-5 py-4 mb-8 text-xs leading-relaxed"
          style={{ backgroundColor: "rgba(230,180,80,0.08)", borderColor: "rgba(230,180,80,0.3)", color: "var(--sct-amber)" }}
        >
          Draft template — not yet reviewed by a lawyer. If you have subscribers in the EU/UK or
          California, GDPR/CCPA impose additional disclosure and rights requirements not fully
          covered here.
        </div>

        <Section title="1. What we collect">
          <p>
            <strong style={{ color: "var(--sct-text)" }}>Account data:</strong> your email address and
            sign-in method (Google OAuth or emailed sign-in link), via Firebase Authentication.
          </p>
          <p>
            <strong style={{ color: "var(--sct-text)" }}>Billing data:</strong> your subscription status
            and renewal date. Card and payment details are collected and processed directly by
            Stripe — we never see or store your full card number. See{" "}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--sct-btc)" }}>
              Stripe&apos;s Privacy Policy
            </a>.
          </p>
          <p>
            <strong style={{ color: "var(--sct-text)" }}>Messages you send us:</strong> if you use the
            waitlist or contact form, we store the name, email, and message you provide.
          </p>
          <p>
            We do not use tracking or advertising cookies, and we do not run analytics scripts that
            profile you across other sites. A single first-party, functional cookie keeps you signed
            in.
          </p>
        </Section>

        <Section title="2. How we use it">
          <p>
            To operate your account (sign-in, subscription status, access control), to respond to
            messages you send us, and to maintain the security of the Service. We do not sell your
            data, and we do not share it with third parties except the service providers below, who
            process it on our behalf to run the Service.
          </p>
        </Section>

        <Section title="3. Who we share data with">
          <p>
            <strong style={{ color: "var(--sct-text)" }}>Google / Firebase</strong> — authentication and
            database hosting.{" "}
            <strong style={{ color: "var(--sct-text)" }}>Stripe</strong> — payment processing and
            subscription billing.{" "}
            <strong style={{ color: "var(--sct-text)" }}>Vercel</strong> — application hosting.
          </p>
          <p>
            Market-data providers (CoinGecko, CoinMetrics, FRED, and others) supply the charts and
            indicators shown on the Service — we query their public APIs for market data and never
            send them any of your personal information.
          </p>
        </Section>

        <Section title="4. Data retention & deletion">
          <p>
            We retain account and billing data for as long as your account is active, and for a
            reasonable period afterward for legal, tax, and dispute-resolution purposes. You can
            request deletion of your account and associated data at any time via the{" "}
            <Link href="/contact" style={{ color: "var(--sct-btc)" }}>contact form</Link>.
          </p>
        </Section>

        <Section title="5. Your rights">
          <p>
            Depending on where you live, you may have the right to access, correct, export, or delete
            your personal data, and to object to or restrict certain processing. Contact us to
            exercise any of these rights.
          </p>
        </Section>

        <Section title="6. Children's privacy">
          <p>
            The Service is not directed to anyone under 18, and we do not knowingly collect
            information from children.
          </p>
        </Section>

        <Section title="7. Security">
          <p>
            Account and billing data is stored with Firebase and Stripe, both of which maintain
            industry-standard security certifications. No method of transmission or storage is 100%
            secure, and we cannot guarantee absolute security.
          </p>
        </Section>

        <Section title="8. Changes to this policy">
          <p>
            We may update this policy from time to time. Material changes will be reflected by
            updating the effective date above.
          </p>
        </Section>

        <Section title="9. Contact">
          <p>
            Questions about this policy, or want to exercise a data right?{" "}
            <Link href="/contact" style={{ color: "var(--sct-btc)" }}>Contact us</Link>.
          </p>
        </Section>

        <Link href="/" className="text-sm" style={{ color: "var(--sct-btc)" }}>&larr; Back to home</Link>
      </div>
    </div>
  );
}
