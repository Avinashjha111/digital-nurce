import { Phone } from "lucide-react";
import type { ReactNode } from "react";

// Contact number for the Digital Nurse team -- shown to a self-signed-up
// clinic until its first payment activates the account (see the Razorpay
// webhook, which flips clinics.activation_status to 'active').
const CONTACT_PHONE_DISPLAY = "+91 83403 21285";
const CONTACT_PHONE_DIGITS = "918340321285";

export function ActivationPendingBanner({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none blur-sm select-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-start justify-center pt-8 sm:items-center sm:pt-0">
        <div className="mx-4 flex w-full max-w-md flex-col items-center gap-4 rounded-xl border bg-card p-6 text-center shadow-lg">
          <h2 className="text-lg font-semibold">
            Connect with Digital Nurse team to activate your account
          </h2>
          <p className="text-sm text-muted-foreground">
            Your account is almost ready. Reach out to us and we&apos;ll get you set up.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href={`https://wa.me/${CONTACT_PHONE_DIGITS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden>
                <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm5.8 14.13c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.11.11-1.79-.11-.41-.13-.94-.31-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.09.99-2.37c.26-.29.56-.36.75-.36h.54c.17 0 .4-.06.63.48s.78 1.87.85 2.01c.07.14.11.3.02.49-.09.19-.14.31-.28.47-.14.16-.29.36-.42.49-.14.14-.29.29-.12.57.17.28.75 1.24 1.61 2.01 1.11.99 2.04 1.3 2.32 1.44.28.14.44.12.61-.07.17-.19.71-.83.9-1.11.19-.28.38-.24.63-.14.26.09 1.62.77 1.9.91.28.14.46.21.53.33.07.12.07.66-.17 1.34Z" />
              </svg>
              WhatsApp us
            </a>
            <a
              href={`tel:+${CONTACT_PHONE_DIGITS}`}
              className="inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Phone className="size-4" />
              {CONTACT_PHONE_DISPLAY}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
