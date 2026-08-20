import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { Container } from "@/components/marketing/container";

const columns = [
  {
    heading: "Product",
    links: [
      { href: "/#features", label: "Features" },
      { href: "/#how-it-works", label: "How It Works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { href: "/privacy-policy", label: "Privacy Policy" },
      { href: "/terms", label: "Terms & Conditions" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <Container className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 md:grid-cols-4">
        <div className="flex flex-col gap-3 sm:col-span-2 md:col-span-1">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Stethoscope className="size-4" />
            </span>
            Digital Nurse
          </Link>
          <p className="max-w-xs text-sm text-muted-foreground">
            Digital patient communication and follow-up tools for modern
            clinics.
          </p>
        </div>

        {columns.map((column) => (
          <div key={column.heading} className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold">{column.heading}</h3>
            <ul className="flex flex-col gap-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <div className="border-t">
        <Container className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <p>© 2026 Digital Nurse. All rights reserved.</p>
          <p>Not a substitute for professional medical judgment.</p>
        </Container>
      </div>
    </footer>
  );
}
