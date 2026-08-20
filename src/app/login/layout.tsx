import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login — Digital Nurse",
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
