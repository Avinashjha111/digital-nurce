import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/marketing/container";

export function FinalCta() {
  return (
    <section className="py-16 sm:py-24">
      <Container>
        <div className="flex flex-col items-center gap-6 rounded-3xl bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Give Your Clinic a Better Way to Follow Up.
          </h2>
          <p className="max-w-xl text-pretty text-primary-foreground/90 sm:text-lg">
            Connect patient communication, prescription reminders and
            follow-ups in one simple workflow.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              variant="secondary"
              className="h-11 px-6 text-base"
              nativeButton={false}
              render={<Link href="/contact" />}
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 border-primary-foreground/30 bg-transparent px-6 text-base text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              nativeButton={false}
              render={<Link href="/contact" />}
            >
              Contact Us
            </Button>
          </div>
        </div>
      </Container>
    </section>
  );
}
