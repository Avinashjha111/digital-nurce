import type { Metadata } from "next";
import { Hero } from "@/components/marketing/sections/hero";
import { Problem } from "@/components/marketing/sections/problem";
import { WhatIs } from "@/components/marketing/sections/what-is";
import { Features } from "@/components/marketing/sections/features";
import { AiWorkflow } from "@/components/marketing/sections/ai-workflow";
import { WhatsappSection } from "@/components/marketing/sections/whatsapp-section";
import { HowItWorks } from "@/components/marketing/sections/how-it-works";
import { Benefits } from "@/components/marketing/sections/benefits";
import { WhyDigitalNurse } from "@/components/marketing/sections/why-digital-nurse";
import { AgencyClinicModel } from "@/components/marketing/sections/agency-clinic-model";
import { PricingPreview } from "@/components/marketing/sections/pricing-preview";
import { Faq } from "@/components/marketing/sections/faq";
import { FinalCta } from "@/components/marketing/sections/final-cta";

export const metadata: Metadata = {
  title: "Digital Nurse — Digital Patient Follow-Up for Clinics",
  description:
    "Digital Nurse helps clinics manage WhatsApp patient communication, prescription reminders and follow-ups with AI-assisted workflows and human approval.",
  openGraph: {
    title: "Digital Nurse — Digital Patient Follow-Up for Clinics",
    description:
      "Digital Nurse helps clinics manage WhatsApp patient communication, prescription reminders and follow-ups with AI-assisted workflows and human approval.",
    type: "website",
  },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <WhatIs />
      <Features />
      <AiWorkflow />
      <WhatsappSection />
      <HowItWorks />
      <Benefits />
      <WhyDigitalNurse />
      <AgencyClinicModel />
      <PricingPreview />
      <Faq />
      <FinalCta />
    </>
  );
}
