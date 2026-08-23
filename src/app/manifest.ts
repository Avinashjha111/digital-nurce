import type { MetadataRoute } from "next";

// The installable app target is the Doctor/Clinic web app -- start_url
// lands there directly; scope covers the whole app (not just /clinic) so
// /login stays inside standalone mode too, since that's the required
// stop on the way in for a signed-out user.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Digital Nurse",
    short_name: "Digital Nurse",
    description: "WhatsApp patient communication and follow-up for clinics.",
    start_url: "/clinic/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#F8FAFC",
    theme_color: "#F97316",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
