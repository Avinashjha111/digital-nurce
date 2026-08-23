import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { PwaRegister } from "@/components/pwa/pwa-register";
import { InstallPromptProvider } from "@/components/pwa/install-prompt-context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://digitalnurse.in"),
  title: {
    default: "Digital Nurse — Digital Patient Follow-Up for Clinics",
    template: "%s",
  },
  description:
    "Digital Nurse helps clinics manage WhatsApp patient communication, prescription reminders and follow-ups with AI-assisted workflows and human approval.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Digital Nurse",
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <InstallPromptProvider>{children}</InstallPromptProvider>
        <Toaster />
        <PwaRegister />
      </body>
    </html>
  );
}
