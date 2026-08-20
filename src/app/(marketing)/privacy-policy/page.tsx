import type { Metadata } from "next";
import { Container } from "@/components/marketing/container";

export const metadata: Metadata = {
  title: "Privacy Policy — Digital Nurse",
  description: "How Digital Nurse collects, uses and protects information.",
};

const sections = [
  {
    heading: "Information We Collect",
    body: "We collect information necessary to provide clinic patient-communication and follow-up services, including account information, clinic information, patient information, uploaded prescriptions/files, and WhatsApp message data.",
  },
  {
    heading: "Account Information",
    body: "When an agency or clinic staff member creates an account, we collect information such as name, email address, role and login credentials.",
  },
  {
    heading: "Clinic Information",
    body: "We collect information provided by an agency or clinic, such as clinic name, contact details and WhatsApp connection settings.",
  },
  {
    heading: "Patient Information",
    body: "Clinics may enter patient information such as name and WhatsApp number to enable communication and follow-up on their behalf.",
  },
  {
    heading: "Uploaded Prescriptions/Files",
    body: "Clinics may upload prescription images or files. These are stored securely and used to generate AI-assisted extraction for human review.",
  },
  {
    heading: "WhatsApp Message Data",
    body: "Messages sent and received through WhatsApp on behalf of a clinic are stored to maintain conversation history and message status.",
  },
  {
    heading: "AI Processing",
    body: "Prescription images may be processed by an AI provider to extract medicine names, dosage, frequency and instructions. Extracted information is always reviewed by a human before it is used to create reminders.",
  },
  {
    heading: "How Information Is Used",
    body: "Information is used to operate the service: enabling clinic-patient communication, generating AI-assisted prescription extraction, scheduling reminders, and managing follow-ups.",
  },
  {
    heading: "Data Storage",
    body: "Data is stored using third-party infrastructure providers with access controls in place. [Add data storage location/provider details].",
  },
  {
    heading: "Service Providers",
    body: "We may use third-party service providers to deliver parts of the service, including messaging, AI processing and hosting infrastructure. [List service providers].",
  },
  {
    heading: "Security",
    body: "We use reasonable technical and organizational measures to protect information, including access controls and row-level data isolation between clinics.",
  },
  {
    heading: "Data Retention",
    body: "Information is retained for as long as necessary to provide the service, unless a longer retention period is required by law. [Add specific retention periods].",
  },
  {
    heading: "User Rights",
    body: "Users may request access to, correction of, or deletion of their information, subject to applicable law. [Add data subject rights process].",
  },
  {
    heading: "Contact",
    body: "Questions about this policy can be directed to [Add contact email].",
  },
  {
    heading: "Policy Changes",
    body: "This policy may be updated from time to time. Material changes will be reflected by updating the effective date below.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="py-16 sm:py-24">
      <Container className="flex flex-col gap-10">
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground">
            Legal entity: [Add legal company name] · Address: [Add address] ·
            Effective date: [Add effective date] · Data controller: [Add data
            controller details]
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
