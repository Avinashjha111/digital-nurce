import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/marketing/container";
import { HeroMockup } from "@/components/marketing/hero-mockup";

export function Hero() {
  return (
    <section className="overflow-hidden border-b bg-gradient-to-b from-accent/40 to-background py-16 sm:py-24">
      <Container className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-6">
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Never Let a Patient Follow-Up Get Missed Again.
          </h1>
          <p className="text-pretty text-lg text-muted-foreground">
            Digital Nurse helps clinics manage patient communication,
            prescription-based reminders and follow-ups through WhatsApp —
            so your team can spend less time remembering and more time
            caring.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-11 px-6 text-base"
              nativeButton={false}
              render={<Link href="/contact" />}
            >
              Get Started
              <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-6 text-base"
              nativeButton={false}
              render={<Link href="/#how-it-works" />}
            >
              See How It Works
            </Button>
          </div>
        </div>

        <HeroMockup />
      </Container>
    </section>
  );
}
