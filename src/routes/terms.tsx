import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "./about";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms & Conditions — CA Unity Network" },
      {
        name: "description",
        content:
          "The terms that govern your use of CA Unity Network — a free platform built by Team Unity for CA aspirants.",
      },
      { property: "og:title", content: "Terms & Conditions — CA Unity Network" },
      {
        property: "og:description",
        content:
          "Read the terms and conditions for using the CA Unity Network study platform.",
      },
    ],
  }),
  component: TermsPage,
});

const LAST_UPDATED = "9 July 2026";

function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <section className="border-b border-border bg-hero grain">
        <div className="mx-auto max-w-4xl px-6 py-16 md:py-20">
          <p className="text-sm uppercase tracking-[0.2em] text-gold">Legal</p>
          <h1 className="mt-4 font-display text-4xl font-semibold leading-tight md:text-5xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-muted-foreground">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-14 md:py-20">
        <div className="space-y-10 text-[15px] leading-relaxed text-foreground/90">
          <p className="text-lg text-muted-foreground">
            Welcome to CA Unity Network. These Terms &amp; Conditions ("Terms") govern your access
            to and use of our platform, which is offered free of charge to Chartered Accountancy
            aspirants. By creating an account or using the platform, you agree to these Terms.
          </p>

          <Block title="1. Who we are">
            <p>
              CA Unity Network is a community platform developed and maintained by Team Unity. It
              began as a WhatsApp group of two CA aspirants and has grown into a free study
              companion for 8,000+ students.
            </p>
          </Block>

          <Block title="2. Eligibility">
            <p>
              You must be at least 13 years old to create an account. The platform is designed for
              CA Intermediate and CA Final aspirants; content and features assume that context.
            </p>
          </Block>

          <Block title="3. Your account">
            <ul>
              <li>You are responsible for keeping your credentials confidential.</li>
              <li>
                You agree to provide accurate information (name, email, CA level, exam group, and
                exam date) and to keep it up to date.
              </li>
              <li>
                Notify us immediately if you suspect any unauthorised use of your account. We
                recommend enabling two-factor authentication from your settings.
              </li>
              <li>
                We may suspend or terminate accounts that violate these Terms, harm other users, or
                misuse the platform.
              </li>
            </ul>
          </Block>

          <Block title="4. Free platform, no purchase required">
            <p>
              CA Unity Network is offered entirely free. We do not charge for signup, features, or
              content, and we do not require you to enter payment details. If we ever introduce a
              paid feature in the future, it will be clearly labelled and optional.
            </p>
          </Block>

          <Block title="5. Acceptable use">
            <p>You agree that you will not:</p>
            <ul>
              <li>Use the platform for anything unlawful, abusive, or harmful to others.</li>
              <li>
                Post or share content that infringes intellectual property, is defamatory, obscene,
                or misleading.
              </li>
              <li>
                Attempt to break, reverse-engineer, scrape, or overload the platform, or bypass any
                security or authentication mechanism.
              </li>
              <li>
                Impersonate another person, share your account with others, or create accounts using
                automated means.
              </li>
              <li>
                Use the platform to promote unrelated businesses, coaching classes, or paid services
                without our written permission.
              </li>
            </ul>
          </Block>

          <Block title="6. Content you provide">
            <p>
              You retain ownership of the notes, plans, reminders, and other content you create on
              CA Unity Network. By using the platform, you grant us a limited, non-exclusive licence
              to store and display that content to you as part of the service. We do not use your
              private study content for marketing or sell it to third parties.
            </p>
          </Block>

          <Block title="7. Content we provide">
            <p>
              CA-related content, subject lists, schedules, and guidance on the platform are shared
              in good faith by Team Unity and the community. We try to keep information accurate and
              aligned with ICAI curriculum, but we do not guarantee completeness or that it always
              reflects the latest official notifications. Always cross-check important details with
              official ICAI announcements.
            </p>
          </Block>

          <Block title="8. Community conduct">
            <p>
              Whether inside the app, in linked WhatsApp groups, or in any community space we run,
              treat other students with respect. Harassment, hate speech, spam, and disruptive
              behaviour will lead to removal without notice.
            </p>
          </Block>

          <Block title="9. Third-party services">
            <p>
              The platform relies on third-party providers (for example, authentication, hosting,
              email, and messaging). Your use of features that depend on those services is also
              subject to their terms. Links to external sites, including WhatsApp, are provided for
              convenience and we are not responsible for their content.
            </p>
          </Block>

          <Block title="10. Disclaimers">
            <p>
              CA Unity Network is provided on an "as is" and "as available" basis. We do our best to
              keep it reliable and helpful, but we do not guarantee that it will always be
              uninterrupted, error-free, or that results (such as exam outcomes) will meet your
              expectations. Your CA preparation and exam performance remain your responsibility.
            </p>
          </Block>

          <Block title="11. Limitation of liability">
            <p>
              To the fullest extent permitted by law, Team Unity and CA Unity Network shall not be
              liable for any indirect, incidental, or consequential loss arising from your use of
              the platform. Because the platform is free, our aggregate liability is limited to the
              amount you have paid us — which is zero.
            </p>
          </Block>

          <Block title="12. Termination">
            <p>
              You may delete your account at any time from the settings page or by contacting us.
              We may suspend or terminate access if you breach these Terms or if we are required to
              do so by law. On termination, sections that by their nature should survive (for
              example, disclaimers and limitation of liability) will continue to apply.
            </p>
          </Block>

          <Block title="13. Changes to these Terms">
            <p>
              We may update these Terms occasionally. When we do, we will update the "Last updated"
              date above. If the changes are significant, we will let you know inside the app. Your
              continued use of the platform after changes take effect means you accept the updated
              Terms.
            </p>
          </Block>

          <Block title="14. Governing law">
            <p>
              These Terms are governed by the laws of India. Any dispute relating to the platform
              will be subject to the exclusive jurisdiction of the courts in Mumbai, Maharashtra.
            </p>
          </Block>

          <Block title="15. Contact us">
            <p>
              Have a question, concern, or feedback? Reach us on WhatsApp at{" "}
              <a href="https://wa.me/918828828184" target="_blank" rel="noreferrer" className="text-gold hover:underline">
                +91 88288 28184
              </a>
              . We read every message.
            </p>
          </Block>

          <p className="pt-6 text-sm text-muted-foreground">
            See also our{" "}
            <Link to="/privacy" className="text-gold hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-foreground md:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 [&>ul]:list-disc [&>ul]:space-y-2 [&>ul]:pl-6">
        {children}
      </div>
    </div>
  );
}
