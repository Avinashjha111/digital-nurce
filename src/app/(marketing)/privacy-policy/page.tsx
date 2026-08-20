import type { Metadata } from "next";
import { Container } from "@/components/marketing/container";

export const metadata: Metadata = {
  title: "Privacy Policy — Digital Nurse",
  description: "How Digital Nurse collects, uses and protects information.",
};

function Bullets({ items }: { items: React.ReactNode[] }) {
  return (
    <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground sm:text-base">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="py-16 sm:py-24">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">Last Updated: August 20, 2026</p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            This document should be reviewed by a qualified legal professional
            familiar with applicable data protection and healthcare
            regulations before production use.
          </p>
          <p className="text-sm text-muted-foreground sm:text-base">
            Digital Nurse (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) provides a
            WhatsApp-based communication platform designed for doctors and
            healthcare providers (&quot;Provider(s)&quot;) to communicate with their
            patients. This Privacy Policy explains how we collect, use, store,
            and protect information when you use our services, including
            through WhatsApp Business Platform integrations.
          </p>
          <p className="text-sm text-muted-foreground sm:text-base">
            By using Digital Nurse, you agree to the practices described in
            this policy.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">1. Who This Policy Applies To</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              This policy applies to:
            </p>
            <Bullets
              items={[
                "Providers (doctors, clinics, hospitals) who use our dashboard to manage patient communication.",
                "Patients who receive or send messages through a Provider's WhatsApp number that is powered by Digital Nurse.",
              ]}
            />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>

            <div className="flex flex-col gap-2">
              <h3 className="font-medium">2.1 From Providers</h3>
              <Bullets
                items={[
                  "Name, business/clinic name, email address, phone number.",
                  "Business registration or verification details required for WhatsApp Business Platform onboarding.",
                  "Login credentials and account activity on our dashboard.",
                  "Billing and payment information.",
                ]}
              />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-medium">2.2 From Patients (via WhatsApp)</h3>
              <Bullets
                items={[
                  "Phone number and WhatsApp profile name.",
                  "Messages exchanged with the Provider (appointment requests, health queries, reminders, etc.).",
                  "Any information voluntarily shared by the patient during conversation, which may include health-related information.",
                ]}
              />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="font-medium">2.3 Automatically Collected Information</h3>
              <Bullets
                items={[
                  "Device and usage information (IP address, browser type, log data) when using our dashboard or website.",
                  "Message delivery status (sent, delivered, read) as provided by WhatsApp.",
                ]}
              />
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">3. How We Use Information</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              We use collected information to:
            </p>
            <Bullets
              items={[
                "Enable Providers to send and receive WhatsApp messages with their patients.",
                "Operate, maintain, and improve the Digital Nurse dashboard and services.",
                "Facilitate appointment scheduling, reminders, and patient follow-ups on behalf of Providers.",
                "Process billing and manage Provider accounts.",
                "Comply with legal obligations and respond to lawful requests from authorities.",
              ]}
            />
            <p className="text-sm text-muted-foreground sm:text-base">
              We do not sell patient or Provider personal data to third parties.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">
              4. Sensitive / Health-Related Information
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Because Digital Nurse facilitates communication between doctors
              and patients, messages may contain health-related information.
              We treat this as sensitive personal data and apply additional
              safeguards, including:
            </p>
            <Bullets
              items={[
                "Restricting access to patient conversations to the relevant Provider account only.",
                "Encrypting data in transit.",
                "Not using patient health information for advertising or unrelated commercial purposes.",
              ]}
            />
            <p className="text-sm text-muted-foreground sm:text-base">
              Providers are responsible for ensuring their own use of the
              platform complies with applicable healthcare and data
              protection regulations relevant to their practice and
              jurisdiction.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">5. How We Share Information</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              We share information only in the following circumstances:
            </p>
            <Bullets
              items={[
                <>
                  <strong className="text-foreground">WhatsApp / Meta:</strong>{" "}
                  Messages sent through our platform are transmitted via the
                  WhatsApp Business Platform (Cloud API), operated by Meta.
                  Meta&apos;s own WhatsApp Business Data Processing Terms and
                  privacy practices apply to data processed through WhatsApp.
                </>,
                <>
                  <strong className="text-foreground">Service Providers:</strong>{" "}
                  We may share information with hosting, database, AI-assisted
                  processing, analytics, or payment providers who help us
                  operate our services, under confidentiality obligations.
                </>,
                <>
                  <strong className="text-foreground">Legal Requirements:</strong>{" "}
                  We may disclose information if required by law, court
                  order, or government request.
                </>,
                <>
                  <strong className="text-foreground">Business Transfers:</strong>{" "}
                  In case of a merger, acquisition, or sale of assets,
                  information may be transferred, subject to this policy or a
                  materially similar one.
                </>,
              ]}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">6. Data Storage and Security</h2>
            <Bullets
              items={[
                "We implement reasonable technical and organizational measures (such as encryption and access controls) to protect information from unauthorized access, loss, or misuse.",
                "Data is stored on secure servers. [Add hosting region/provider details].",
                "No method of transmission or storage is 100% secure; we cannot guarantee absolute security.",
              ]}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">7. Data Retention</h2>
            <Bullets
              items={[
                "We retain Provider account information for as long as the account is active and as required for legal or billing purposes.",
                "Patient conversation data is retained for [Add retention period], after which it may be deleted or anonymized, unless a longer period is required by law.",
              ]}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">8. Your Rights</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Depending on applicable law (including India&apos;s Digital
              Personal Data Protection Act, 2023), you may have the right to:
            </p>
            <Bullets
              items={[
                "Access the personal data we hold about you.",
                "Request correction of inaccurate data.",
                "Request deletion of your data, subject to legal retention requirements.",
                'Withdraw consent to further communication (patients can opt out of WhatsApp messages at any time by replying "STOP" or contacting the Provider directly).',
              ]}
            />
            <p className="text-sm text-muted-foreground sm:text-base">
              To exercise these rights, contact us at info@digitalnurse.in.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">9. Children&apos;s Privacy</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Digital Nurse is intended for use by licensed healthcare
              Providers and their patients. We do not knowingly collect data
              directly from children without appropriate parental/guardian
              involvement facilitated by the Provider.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">10. Cookies and Tracking (Website/Dashboard)</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Our website and dashboard may use cookies or similar
              technologies to improve user experience and analyze usage. You
              can control cookie preferences through your browser settings.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">11. Changes to This Policy</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              We may update this Privacy Policy from time to time. Material
              changes will be communicated via our website or dashboard.
              Continued use of Digital Nurse after changes take effect
              constitutes acceptance of the revised policy.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">12. Contact Us</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              If you have questions or concerns about this Privacy Policy or
              how your data is handled, contact us at:
            </p>
            <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:text-base">
              <span>Digital Nurse</span>
              <span>Email: info@digitalnurse.in</span>
              <span>Phone: 9187641492</span>
              <span>Address: [Add business address]</span>
              <span>Website: https://digitalnurse.in</span>
            </div>
          </section>

          <p className="text-xs text-muted-foreground">
            This Privacy Policy is provided as a general template and does
            not constitute legal advice. Given that Digital Nurse handles
            health-related data, we recommend having this document reviewed
            by a qualified legal professional familiar with applicable data
            protection and healthcare regulations before publishing.
          </p>
        </div>
      </Container>
    </div>
  );
}
