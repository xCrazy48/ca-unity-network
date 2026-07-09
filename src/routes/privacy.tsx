import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "./about";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — CA Unity Network" },
      {
        name: "description",
        content:
          "How CA Unity Network collects, uses, and protects your personal information. Read our full privacy policy for CA students.",
      },
      { property: "og:title", content: "Privacy Policy — CA Unity Network" },
      {
        property: "og:description",
        content:
          "Our commitment to protecting the privacy of CA students on the CA Unity Network platform.",
      },
    ],
  }),
  component: PrivacyPage,
});

const LAST_UPDATED = "9 July 2026";

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="border-b border-border bg-hero grain">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
          <p className="text-sm uppercase tracking-[0.2em] text-gold">Legal</p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <div className="prose-legal space-y-10 text-[15px] leading-relaxed text-foreground/90">
          <Intro>
            CA Unity Network ("we", "us", "our") is a free platform built by Team Unity to help
            Chartered Accountancy aspirants prepare better. We take your privacy seriously — this
            policy explains what we collect, why we collect it, and the choices you have.
          </Intro>

          <Block title="1. Information we collect">
            <p>When you use CA Unity Network, we may collect:</p>
            <ul>
              <li>
                <strong>Account information</strong> — your name, email address, and password (hashed).
                If you sign in with Google, we receive your name, email, and profile picture from Google.
              </li>
              <li>
                <strong>Profile information</strong> — CA level (Intermediate or Final), exam group,
                exam month/year, and other study preferences you choose to add.
              </li>
              <li>
                <strong>Usage data</strong> — pages you view, features you use, study sessions, and
                the time you spend on each. This helps us improve the platform.
              </li>
              <li>
                <strong>Device &amp; login data</strong> — IP address, browser, operating system, and
                approximate location (derived from IP). We log this for every sign-in to protect your
                account against unauthorised access.
              </li>
              <li>
                <strong>Content you create</strong> — notes, reminders, planner entries, and any files
                you upload to your private storage.
              </li>
            </ul>
          </Block>

          <Block title="2. How we use your information">
            <ul>
              <li>To create and secure your account, and to authenticate you.</li>
              <li>To personalise your dashboard based on your CA level, group, and exam date.</li>
              <li>To send you reminders, updates, and platform notifications you have enabled.</li>
              <li>To detect and prevent fraud, abuse, and unauthorised access.</li>
              <li>To improve features, fix bugs, and understand how the platform is used in aggregate.</li>
            </ul>
            <p>
              We do <strong>not</strong> sell your personal information to third parties. We do not
              run advertisements on CA Unity Network.
            </p>
          </Block>

          <Block title="3. Legal basis (for users in applicable regions)">
            <p>
              We process your information on the basis of the contract we have with you when you use
              the platform, our legitimate interest in operating and improving a safe service, your
              consent (where required, such as for optional notifications), and to comply with legal
              obligations.
            </p>
          </Block>

          <Block title="4. Sharing your information">
            <p>We share your information only in these limited situations:</p>
            <ul>
              <li>
                <strong>Service providers</strong> — infrastructure providers (hosting, database,
                email, analytics) that process data on our behalf under strict confidentiality.
              </li>
              <li>
                <strong>Authentication providers</strong> — if you sign in with Google, Google
                handles the sign-in and shares limited profile information with us.
              </li>
              <li>
                <strong>Legal requirements</strong> — when required to comply with law, protect our
                rights, or protect the safety of our users.
              </li>
            </ul>
          </Block>

          <Block title="5. Data retention">
            <p>
              We keep your account information for as long as your account is active. Login history
              and activity logs are retained for a limited period for security and analytics. When
              you delete your account, we remove your personal data within a reasonable period,
              except where we are required to retain it by law.
            </p>
          </Block>

          <Block title="6. Security">
            <p>
              We protect your data using industry-standard practices — encrypted connections (HTTPS),
              row-level security on our database, hashed passwords, and optional two-factor
              authentication (2FA). No system is 100% secure, so we also encourage you to use a
              strong, unique password and to enable 2FA in your settings.
            </p>
          </Block>

          <Block title="7. Your rights">
            <p>You can, at any time:</p>
            <ul>
              <li>Access and update your profile information from the settings page.</li>
              <li>Download or delete content you have created.</li>
              <li>Request deletion of your account by writing to us at the contact below.</li>
              <li>Withdraw consent for optional communications.</li>
            </ul>
          </Block>

          <Block title="8. Children">
            <p>
              CA Unity Network is intended for CA aspirants, typically aged 17 and above. We do not
              knowingly collect personal information from children under 13. If you believe a child
              has provided us information, please contact us and we will remove it.
            </p>
          </Block>

          <Block title="9. Changes to this policy">
            <p>
              We may update this policy from time to time. When we do, we will change the "Last
              updated" date at the top and, for material changes, notify you inside the app or by
              email.
            </p>
          </Block>

          <Block title="10. Contact us">
            <p>
              Questions about this policy? Message us on WhatsApp at{" "}
              <a href="https://wa.me/918828828184" target="_blank" rel="noreferrer" className="text-gold hover:underline">
                +91 88288 28184
              </a>{" "}
              or reach out through the community group.
            </p>
          </Block>

          <p className="pt-6 text-sm text-muted-foreground">
            See also our{" "}
            <Link to="/terms" className="text-gold hover:underline">
              Terms &amp; Conditions
            </Link>
            .
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Intro({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-lg leading-relaxed text-muted-foreground">{children}</p>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-foreground md:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-6 [&_a]:underline-offset-2">
        {children}
      </div>
    </div>
  );
}
