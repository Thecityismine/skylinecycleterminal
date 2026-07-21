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

function List({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 py-16" style={{ backgroundColor: "var(--sct-bg)" }}>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-semibold mb-1" style={{ color: "var(--sct-text)" }}>Terms of Service</h1>
        <p className="text-xs mb-8" style={{ color: "var(--sct-muted)" }}>Effective {EFFECTIVE_DATE}</p>

        <Section title="1. Acceptance of terms">
          <p>
            Welcome to Skyline Cycle Terminal (&quot;Skyline&quot;, &quot;the Service&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;). By
            accessing, creating an account, purchasing a subscription, or otherwise using the Service, you
            agree to be bound by these Terms of Service. If you do not agree to these Terms, you may not
            access or use the Service.
          </p>
          <p>
            You represent that you are at least 18 years of age and legally capable of entering into this
            agreement.
          </p>
        </Section>

        <Section title="2. About Skyline">
          <p>
            Skyline Cycle Terminal is operated by <strong style={{ color: "var(--sct-text)" }}>Thecityismine LLC</strong>,
            a Wyoming limited liability company doing business as Skyline Cycle Terminal, based in
            Miami, Florida, USA.
          </p>
          <p>
            Skyline is a subscription-based analytics platform designed to help investors understand
            long-term Bitcoin and Ethereum market cycles through data visualization, market models,
            macroeconomic indicators, and on-chain analytics.
          </p>
        </Section>

        <Section title="3. Educational purposes only">
          <p>Skyline Cycle Terminal is an educational and market research platform. Nothing on the Service constitutes:</p>
          <List
            items={[
              "Financial advice",
              "Investment advice",
              "Trading advice",
              "Tax advice",
              "Legal advice",
              "A solicitation to buy or sell securities or digital assets",
            ]}
          />
          <p>
            The Service provides market analysis, proprietary indicators, statistical models, historical
            data, and educational commentary designed to help users better understand market conditions.
            All investment decisions remain solely your responsibility. Past performance does not
            guarantee future results. Digital assets are highly volatile and involve substantial risk,
            including the possible loss of your entire investment.
          </p>
        </Section>

        <Section title="4. Market data & accuracy">
          <p>Skyline aggregates data from multiple third-party providers, including but not limited to CoinGecko, CoinMetrics, FRED, TradingView, exchange APIs, ETF data providers, and blockchain data providers.</p>
          <p>While we strive for accuracy, we cannot guarantee that market data is complete, pricing is accurate, charts are error-free, indicators are uninterrupted, or calculations are always current. Third-party providers may delay, modify, or discontinue their data without notice. Skyline should never be relied upon as your sole source of investment information.</p>
        </Section>

        <Section title="5. Accounts">
          <p>To use premium features, you must create an account. You are responsible for maintaining the security of your account, protecting your password or authentication method, and all activity occurring under your account.</p>
          <p>Authentication may be provided through Google Sign-In, passwordless email login, or other authentication providers we may add in the future. You agree to immediately notify us of unauthorized access.</p>
        </Section>

        <Section title="6. Subscriptions & billing">
          <p>Skyline Cycle Terminal is offered as an annual subscription at $99 USD per year, billed in advance and processed securely through Stripe. Your subscription automatically renews at the then-current price each year unless you cancel before the renewal date.</p>
          <p>You may cancel at any time; cancellation prevents future billing but does not refund the current subscription period. Unless required by applicable law, subscription payments are non-refundable. If payment cannot be processed, access to premium features may be suspended until payment is successfully completed.</p>
          <p>Pricing may change in the future. Existing subscribers will be notified before any pricing change affects their renewal.</p>
        </Section>

        <Section title="7. Acceptable use">
          <p>You agree not to:</p>
          <List
            items={[
              "share your account with others",
              "redistribute Skyline content",
              "copy proprietary indicators",
              "republish, screenshot, or redistribute Skyline charts, indicators, or proprietary metrics for commercial purposes without our prior written permission",
              "scrape or bulk-download platform data",
              "automate access without permission",
              "reverse-engineer the Service",
              "attempt to bypass subscription controls",
              "interfere with platform security",
              "use Skyline for unlawful purposes",
            ]}
          />
          <p>Violation of these terms may result in suspension or permanent termination without refund.</p>
        </Section>

        <Section title="8. Intellectual property">
          <p>
            Skyline Cycle Terminal, including but not limited to the Skyline Cycle Score, proprietary
            market models, chart designs, indicators, dashboards, graphics, software, branding, logos,
            documentation, and written content, is protected intellectual property owned by Skyline
            Cycle Terminal unless otherwise noted.
          </p>
          <p>Your subscription grants a limited, non-exclusive, non-transferable license to access the Service for personal use. No ownership rights are transferred.</p>
        </Section>

        <Section title="9. Availability">
          <p>We strive to provide continuous access but cannot guarantee uninterrupted service. Skyline may occasionally be unavailable due to maintenance, software updates, third-party outages, infrastructure failures, or events outside our control. We reserve the right to modify or discontinue features without prior notice.</p>
        </Section>

        <Section title="10. No warranty">
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available.&quot; To the fullest extent permitted by law,
            Skyline disclaims all warranties, including but not limited to merchantability, fitness for a
            particular purpose, accuracy, reliability, uninterrupted availability, and non-infringement.
          </p>
        </Section>

        <Section title="11. Limitation of liability">
          <p>To the fullest extent permitted by law, Skyline shall not be liable for investment losses, trading losses, lost profits, lost business opportunities, or indirect, incidental, consequential, or punitive damages. Your sole remedy for dissatisfaction with the Service is to discontinue using it.</p>
          <p>Our total liability for any claim shall never exceed the total subscription fees paid by you during the twelve (12) months preceding the claim.</p>
        </Section>

        <Section title="12. No fiduciary relationship">
          <p>Your use of the Service does not create a fiduciary, advisory, or client relationship between you and Skyline. We are not your investment advisor, broker, or fiduciary, and owe you no duties beyond those expressly stated in these Terms.</p>
        </Section>

        <Section title="13. AI & predictive models disclaimer">
          <p>Skyline&apos;s cycle scoring, market models, and other analytical tools are statistical and heuristic in nature. They are built from historical data and are not predictions, guarantees, or forecasts of future market behavior. Model outputs may be wrong, may lag real market conditions, and should be treated as one input among many in your own research — never as a signal to act on alone.</p>
        </Section>

        <Section title="14. Termination">
          <p>We may suspend or terminate your account if you violate these Terms, misuse the Service, fraudulent activity is detected, or payment obligations are not met. You may terminate your subscription at any time through your account settings. Termination does not entitle you to a refund of previously paid subscription fees.</p>
        </Section>

        <Section title="15. Future features">
          <p>Skyline is an evolving platform. We may add, remove, or modify dashboards, indicators, pricing, integrations, research, or features at our discretion. These changes do not constitute a breach of this agreement.</p>
        </Section>

        <Section title="16. Changes to these terms">
          <p>We may update these Terms periodically. Material changes will be reflected by updating the effective date above. Continued use of Skyline after updated Terms become effective constitutes acceptance of the revised Terms.</p>
        </Section>

        <Section title="17. Governing law">
          <p>These Terms are governed by the laws of the State of Wyoming, United States, without regard to conflict-of-law principles. Any disputes arising from these Terms shall be resolved exclusively in the state or federal courts located in Wyoming.</p>
        </Section>

        <Section title="18. Contact">
          <p>
            Questions about these terms? <Link href="/contact" style={{ color: "var(--sct-btc)" }}>Contact us</Link> or
            email <a href="mailto:support@skylinecycleterminal.com" style={{ color: "var(--sct-btc)" }}>support@skylinecycleterminal.com</a>.
          </p>
        </Section>

        <Link href="/" className="text-sm" style={{ color: "var(--sct-btc)" }}>&larr; Back to home</Link>
      </div>
    </div>
  );
}
