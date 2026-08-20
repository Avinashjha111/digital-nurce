import type { Metadata } from "next";
import { Container } from "@/components/marketing/container";

export const metadata: Metadata = {
  title: "Terms & Conditions — Digital Nurse",
  description: "Terms and conditions for using Digital Nurse.",
};

const sections = [
  {
    heading: "Acceptance",
    body: "By accessing or using Digital Nurse, an agency, clinic, or authorized user agrees to be bound by these Terms & Conditions.",
  },
  {
    heading: "Service Description",
    body: "Digital Nurse is a software and communication tool that helps clinics manage patient communication, prescription-based reminders and follow-ups through WhatsApp, with AI-assisted prescription extraction subject to human review and approval.",
  },
  {
    heading: "Account Responsibility",
    body: "Agency and clinic accounts are responsible for maintaining the confidentiality of login credentials and for all activity under their account.",
  },
  {
    heading: "Clinic Responsibility",
    body: "Clinics are responsible for the accuracy of patient information they enter, for reviewing and approving AI-extracted prescription information before it is used, and for their communications sent to patients.",
  },
  {
    heading: "Patient Data Responsibility",
    body: "Clinics are responsible for obtaining any consent required from patients to communicate with them through WhatsApp and to process their information within Digital Nurse.",
  },
  {
    heading: "Acceptable Use",
    body: "The service must not be used for unlawful purposes, to send unsolicited messages outside applicable WhatsApp policies, or to misuse patient data.",
  },
  {
    heading: "AI Limitations",
    body: "AI-assisted prescription extraction may be inaccurate or incomplete. Extracted information is not final until reviewed and approved by clinic staff.",
  },
  {
    heading: "Medical Disclaimer",
    body: "Digital Nurse is a software and communication tool. It is not a doctor, medical diagnosis system or replacement for professional medical judgment.",
  },
  {
    heading: "WhatsApp/Provider Dependency",
    body: "Message delivery depends on WhatsApp and underlying messaging infrastructure providers. Digital Nurse is not responsible for outages or policy changes by these third parties.",
  },
  {
    heading: "Third-Party Services",
    body: "Digital Nurse relies on third-party services for messaging, AI processing and hosting. [List third-party service dependencies].",
  },
  {
    heading: "Payments/Subscriptions",
    body: "Paid plans, billing cycles and cancellation terms will be provided at the time of subscription. [Add payment/subscription terms].",
  },
  {
    heading: "Intellectual Property",
    body: "All software, branding and content associated with Digital Nurse remain the property of [Add legal company name] unless otherwise stated.",
  },
  {
    heading: "Availability",
    body: "We aim to keep the service available but do not guarantee uninterrupted access. Scheduled maintenance or third-party outages may affect availability.",
  },
  {
    heading: "Limitation of Liability",
    body: "To the extent permitted by law, Digital Nurse is not liable for indirect, incidental or consequential damages arising from use of the service. [Add jurisdiction-specific liability terms].",
  },
  {
    heading: "Termination",
    body: "Accounts may be suspended or terminated for violation of these terms. [Add termination process details].",
  },
  {
    heading: "Changes",
    body: "These terms may be updated from time to time. Continued use of the service after changes constitutes acceptance of the updated terms.",
  },
  {
    heading: "Contact",
    body: "Questions about these terms can be directed to [Add contact email].",
  },
];

export default function TermsPage() {
  return (
    <div className="py-16 sm:py-24">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Terms &amp; Conditions
          </h1>
          <p className="text-sm text-muted-foreground">
            Legal entity: [Add legal company name] · Effective date: [Add
            effective date]
          </p>
          <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
            This document is a placeholder and should be reviewed by a
            qualified legal professional before production use.
          </p>
        </div>

        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-2">
              <h2 className="text-xl font-semibold">{section.heading}</h2>
              <p className="text-sm text-muted-foreground sm:text-base">
                {section.body}
              </p>
            </section>
          ))}
        </div>
      </Container>
    </div>
  );
}
