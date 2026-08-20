import type { Metadata } from "next";
import { Container } from "@/components/marketing/container";

export const metadata: Metadata = {
  title: "Terms & Conditions — Digital Nurse",
  description: "Terms and conditions for using Digital Nurse.",
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

export default function TermsPage() {
  return (
    <div className="py-16 sm:py-24">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-muted-foreground">Last Updated: August 20, 2026</p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            This document should be reviewed by a qualified legal professional
            before production use.
          </p>
          <p className="text-sm text-muted-foreground sm:text-base">
            Please read these Terms and Conditions (&quot;Terms&quot;) carefully
            before using the Digital Nurse platform (&quot;Service,&quot;
            &quot;Platform,&quot; &quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). By
            registering for, accessing, or using our Service, you
            (&quot;Provider,&quot; &quot;you,&quot; or &quot;your&quot;) agree to be bound by
            these Terms. If you do not agree, do not use the Service.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">1. Description of Service</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Digital Nurse is a communication platform that enables licensed
              doctors, clinics, and healthcare providers to communicate with
              their patients via the WhatsApp Business Platform. Our Service
              includes a dashboard for managing patient conversations,
              appointment reminders, and related messaging features, powered
              through Meta&apos;s WhatsApp Business Platform.
            </p>
            <p className="text-sm text-muted-foreground sm:text-base">
              Digital Nurse is a communication tool only. We do not provide
              medical advice, diagnosis, or treatment, and we are not a party
              to the doctor-patient relationship.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">2. Eligibility</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              To use Digital Nurse, you must:
            </p>
            <Bullets
              items={[
                "Be a licensed healthcare provider, clinic, hospital, or an authorized representative of one.",
                "Be legally authorized to conduct business and communicate with patients in your jurisdiction.",
                "Provide accurate and complete registration information, including business verification details required for WhatsApp Business Platform onboarding.",
              ]}
            />
            <p className="text-sm text-muted-foreground sm:text-base">
              We reserve the right to refuse or suspend access if eligibility
              requirements are not met.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">
              3. Account Registration and Responsibilities
            </h2>
            <Bullets
              items={[
                "You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.",
                "You must notify us immediately of any unauthorized use of your account.",
                "You are responsible for ensuring that all information sent to patients through the Platform is accurate, appropriate, and compliant with applicable medical and ethical standards.",
              ]}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">4. Use of WhatsApp Business Platform</h2>
            <Bullets
              items={[
                "Your use of WhatsApp messaging through Digital Nurse is subject to Meta's WhatsApp Business Messaging Policy and Meta's Terms of Service, in addition to these Terms.",
                "You agree not to use the Platform to send spam, unsolicited marketing messages, or any content that violates WhatsApp's policies, as this may result in your WhatsApp number being restricted or banned by Meta.",
                "Messages must only be sent to patients who have provided consent (opt-in) to receive communication via WhatsApp, in accordance with WhatsApp's messaging guidelines.",
                "We are not responsible for message delivery failures, delays, or account restrictions imposed directly by Meta or WhatsApp.",
              ]}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">5. Fees and Billing</h2>
            <Bullets
              items={[
                "Use of the Platform requires payment of applicable fees, which include: (a) WhatsApp conversation/usage charges billed by Meta, and (b) Digital Nurse's own service/dashboard fees.",
                "Fees, billing cycles, and payment terms will be communicated separately at the time of subscription or as updated on our pricing page.",
                "Failure to pay applicable fees may result in suspension or termination of your access to the Service.",
                "All fees are exclusive of applicable taxes unless stated otherwise.",
              ]}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">6. Patient Data and Your Responsibilities</h2>
            <Bullets
              items={[
                "As the healthcare Provider, you remain solely responsible for the accuracy, appropriateness, and legality of any medical or health-related information communicated to patients through the Platform.",
                "You are responsible for obtaining necessary patient consent before initiating WhatsApp communication and for complying with all applicable healthcare, privacy, and data protection laws (including India's Digital Personal Data Protection Act, 2023, and any medical council regulations applicable to you).",
                "Digital Nurse acts as a technology facilitator and does not review, verify, or take responsibility for the content of communications between you and your patients.",
              ]}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">7. Not a Substitute for Emergency Care</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Digital Nurse is not intended for use in medical emergencies.
              Patients should be clearly informed to contact emergency
              services or visit the nearest hospital directly in case of a
              medical emergency, rather than relying on WhatsApp
              communication through this Platform.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">8. Prohibited Uses</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              You agree not to use the Platform to:
            </p>
            <Bullets
              items={[
                "Send false, misleading, or fraudulent medical information.",
                "Violate any applicable law, regulation, or third-party right.",
                "Send unsolicited bulk messages or spam.",
                "Attempt to reverse-engineer, disrupt, or gain unauthorized access to the Platform or its underlying infrastructure (including Meta's systems).",
                "Use the Service for any purpose unrelated to legitimate healthcare communication.",
              ]}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">9. Third-Party Services</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              Our Service relies on third-party infrastructure, including
              Meta (WhatsApp Business Platform). Your use of the Service is
              also subject to the applicable terms of these providers. We are
              not liable for outages, policy changes, or service
              interruptions caused by these third parties.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">10. Intellectual Property</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              All rights, title, and interest in the Digital Nurse platform,
              including its software, design, and branding, remain the
              exclusive property of Digital Nurse. You are granted a
              limited, non-exclusive, non-transferable license to use the
              Platform solely for its intended purpose during your
              subscription period.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">11. Disclaimer of Warranties</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              The Service is provided &quot;as is&quot; and &quot;as available&quot;
              without warranties of any kind, whether express or implied,
              including but not limited to warranties of merchantability,
              fitness for a particular purpose, or non-infringement. We do
              not guarantee uninterrupted, error-free, or secure operation of
              the Service.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">12. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              To the maximum extent permitted by law, Digital Nurse shall not
              be liable for any indirect, incidental, special, consequential,
              or punitive damages, including loss of data, revenue, or
              patient communication, arising from your use of or inability to
              use the Service. Our total liability for any claim shall not
              exceed the fees paid by you in the three (3) months preceding
              the claim.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">13. Indemnification</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              You agree to indemnify and hold harmless Digital Nurse, its
              affiliates, and employees from any claims, damages, or
              liabilities arising out of your use of the Service, your
              violation of these Terms, or your violation of any applicable
              law or third-party right, including claims arising from patient
              communications.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">14. Termination</h2>
            <Bullets
              items={[
                "We may suspend or terminate your access to the Service at any time, with or without notice, if you violate these Terms, fail to pay applicable fees, or engage in conduct that we determine to be harmful to the Platform or other users.",
                "You may terminate your account at any time by providing written notice to us, subject to any applicable notice period specified in your subscription agreement.",
                "Upon termination, your access to the Platform will cease, though certain provisions of these Terms (including indemnification and limitation of liability) will survive termination.",
              ]}
            />
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">15. Changes to These Terms</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              We may update these Terms from time to time. Material changes
              will be communicated via our website or dashboard. Continued
              use of the Service after changes take effect constitutes
              acceptance of the revised Terms.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">
              16. Governing Law and Dispute Resolution
            </h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              These Terms shall be governed by and construed in accordance
              with the laws of India. Any disputes arising out of or relating
              to these Terms shall be subject to the exclusive jurisdiction
              of the courts of [Add city, state].
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-xl font-semibold">17. Contact Us</h2>
            <p className="text-sm text-muted-foreground sm:text-base">
              For any questions regarding these Terms, please contact us at:
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
            This document is provided as a general template and does not
            constitute legal advice. Given that Digital Nurse serves licensed
            healthcare providers and handles health-related communication, we
            strongly recommend having these Terms reviewed by a qualified
            legal professional before publishing.
          </p>
        </div>
      </Container>
    </div>
  );
}
