import type { Metadata } from "next";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { Container } from "@/components/marketing/container";
import { SectionHeading } from "@/components/marketing/section-heading";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact — Digital Nurse",
  description: "Get in touch with the Digital Nurse team.",
};

const contactDetails = [
  {
    icon: Mail,
    label: "Business email",
    value: "info@digitalnurse.in",
    placeholder: false,
  },
  {
    icon: MessageCircle,
    label: "WhatsApp contact",
    value: "9187641492",
    placeholder: false,
  },
  {
    icon: MapPin,
    label: "Business location",
    value: "Add your business location here",
    placeholder: true,
  },
];

export default function ContactPage() {
  return (
    <div className="py-16 sm:py-24">
      <Container className="flex flex-col items-center gap-12">
        <SectionHeading
          title="Let's Talk About Your Clinic"
          description="Tell us a bit about your clinic and we'll get back to you."
        />

        <div className="grid w-full grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ContactForm />
          </div>

          <div className="flex flex-col gap-4 lg:col-span-2">
            {contactDetails.map(({ icon: Icon, label, value, placeholder }) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-xl border bg-card p-5"
              >
                <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p
                    className={
                      placeholder
                        ? "text-sm text-muted-foreground italic"
                        : "text-sm text-muted-foreground"
                    }
                  >
                    {value}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </div>
  );
}
