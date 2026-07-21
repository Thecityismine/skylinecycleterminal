import Link from "next/link";

const EFFECTIVE_DATE = "July 21, 2026";

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

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold mt-4 mb-1.5" style={{ color: "var(--sct-text)" }}>{children}</h3>
  );
}

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen px-6 py-16" style={{ backgroundColor: "var(--sct-bg)" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--sct-text)" }}>Privacy Policy</h1>
        <p className="text-xs mb-8" style={{ color: "var(--sct-muted)" }}>Effective {EFFECTIVE_DATE}</p>

        <p className="text-sm leading-relaxed mb-8" style={{ color: "var(--sct-secondary)" }}>
          Skyline Cycle Terminal (&quot;Skyline&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is operated by{" "}
          <strong style={{ color: "var(--sct-text)" }}>Thecityismine LLC</strong>, a Wyoming limited
          liability company based in Miami, Florida. We respect your privacy and are committed to
          protecting your personal information. This Privacy Policy explains what information we
          collect, how we use it, and the choices available to you when using our website and
          services.
        </p>

        <Section title="1. Information we collect">
          <SubHeading>Account information</SubHeading>
          <p>When you create an account, we may collect:</p>
          <List
            items={[
              "Email address",
              "Authentication method (Google Sign-In or passwordless email login)",
              "Basic account identifiers provided through Firebase Authentication",
            ]}
          />
          <p>We do not collect or store your password.</p>

          <SubHeading>Subscription & billing information</SubHeading>
          <p>Subscriptions are processed securely through Stripe. We may receive information such as:</p>
          <List
            items={["Subscription status", "Billing period", "Renewal date", "Payment confirmation", "Customer ID"]}
          />
          <p>
            We never receive or store your complete credit card number or other sensitive payment
            information. See{" "}
            <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "var(--sct-btc)" }}>
              Stripe&apos;s Privacy Policy
            </a>{" "}
            for more information.
          </p>

          <SubHeading>Contact information</SubHeading>
          <p>If you contact us through the website or email, we may collect:</p>
          <List items={["Name (if provided)", "Email address", "Message contents"]} />
          <p>This information is used only to respond to your inquiry or provide customer support.</p>

          <SubHeading>Technical information</SubHeading>
          <p>When you use Skyline, we may automatically collect limited technical information such as:</p>
          <List
            items={[
              "Browser type",
              "Device type",
              "Operating system",
              "IP address",
              "General geographic region",
              "Date and time of access",
              "Error logs necessary to maintain service reliability",
            ]}
          />
          <p>This information is used solely for security, troubleshooting, and improving the platform.</p>
        </Section>

        <Section title="2. How we use your information">
          <p>We use your information to:</p>
          <List
            items={[
              "Create and manage your account",
              "Authenticate your identity",
              "Process subscription payments",
              "Provide access to premium features",
              "Respond to customer support requests",
              "Improve the Service",
              "Detect fraud or unauthorized activity",
              "Maintain platform security",
              "Comply with legal obligations",
            ]}
          />
          <p>We do not sell your personal information. We do not rent your personal information. We do not use your information for third-party advertising.</p>
        </Section>

        <Section title="3. Cookies">
          <p>Skyline uses only essential first-party cookies required for:</p>
          <List items={["User authentication", "Secure login sessions", "Maintaining your signed-in state"]} />
          <p>We do not use advertising cookies. We do not use cross-site tracking cookies. If we introduce optional analytics cookies in the future, this Privacy Policy will be updated accordingly.</p>
        </Section>

        <Section title="4. Third-party service providers">
          <p>We use trusted third-party providers to operate Skyline, including:</p>
          <SubHeading>Firebase (Google)</SubHeading>
          <List items={["Authentication", "Database hosting", "Secure cloud infrastructure"]} />
          <SubHeading>Stripe</SubHeading>
          <List items={["Subscription billing", "Payment processing"]} />
          <SubHeading>Vercel</SubHeading>
          <List items={["Website and application hosting"]} />
          <SubHeading>Market data providers</SubHeading>
          <p>Skyline retrieves market information from providers including, but not limited to, CoinGecko, CoinMetrics, FRED, TradingView, exchange APIs, and blockchain data providers. These providers supply market data only — we do not send them your personal account information.</p>
        </Section>

        <Section title="5. Data retention">
          <p>We retain personal information only for as long as reasonably necessary to:</p>
          <List
            items={[
              "Provide the Service",
              "Maintain your subscription",
              "Comply with tax and accounting obligations",
              "Resolve disputes",
              "Enforce our agreements",
            ]}
          />
          <p>After your account is closed, certain records may be retained where required by law.</p>
        </Section>

        <Section title="6. Your privacy rights">
          <p>Depending on your location, you may have the right to:</p>
          <List
            items={[
              "Access your personal information",
              "Correct inaccurate information",
              "Request deletion of your data",
              "Request a copy of your data",
              "Object to certain processing",
              "Restrict processing where applicable",
            ]}
          />
          <p>
            To exercise these rights, <Link href="/contact" style={{ color: "var(--sct-btc)" }}>contact us</Link>.
            We will respond within the timeframe required by applicable law.
          </p>
        </Section>

        <Section title="7. California privacy rights">
          <p>
            If you are a California resident, you may have additional rights under California law,
            including the right to know what personal information we collect, the right to request
            deletion, and the right to non-discrimination for exercising these rights. We do not sell
            or share personal information as defined under California law. To exercise these rights,
            contact us using the information below.
          </p>
        </Section>

        <Section title="8. International users">
          <p>Skyline Cycle Terminal is operated from the United States. If you access the Service from outside the United States, you understand that your information may be transferred to and processed in the United States.</p>
        </Section>

        <Section title="9. Children's privacy">
          <p>Skyline is intended only for individuals who are at least 18 years old. We do not knowingly collect personal information from anyone under 18. If we learn that such information has been collected, we will promptly delete it.</p>
        </Section>

        <Section title="10. Security">
          <p>We take reasonable administrative, technical, and organizational measures to protect your information, including secure cloud infrastructure provided by Firebase and Stripe, encrypted communications (HTTPS), and industry-standard security practices. However, no method of electronic storage or internet transmission is completely secure, and we cannot guarantee absolute security.</p>
        </Section>

        <Section title="11. Business transfers">
          <p>If Skyline Cycle Terminal is involved in a merger, acquisition, financing, or sale of assets, your information may be transferred as part of that transaction. Any successor organization will remain bound by the commitments described in this Privacy Policy.</p>
        </Section>

        <Section title="12. Changes to this privacy policy">
          <p>We may update this Privacy Policy from time to time. When material changes are made, we will update the effective date shown at the top of this page. Your continued use of Skyline after those changes become effective constitutes acceptance of the revised Privacy Policy.</p>
        </Section>

        <Section title="13. Contact us">
          <p>
            If you have questions about this Privacy Policy or wish to exercise your privacy rights,{" "}
            <Link href="/contact" style={{ color: "var(--sct-btc)" }}>contact us</Link> or email{" "}
            <a href="mailto:support@skylinecycleterminal.com" style={{ color: "var(--sct-btc)" }}>support@skylinecycleterminal.com</a>.
          </p>
        </Section>

        <Link href="/" className="text-sm" style={{ color: "var(--sct-btc)" }}>&larr; Back to home</Link>
      </div>
    </div>
  );
}
