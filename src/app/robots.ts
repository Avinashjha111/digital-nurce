import type { MetadataRoute } from "next";

const SITE_URL = "https://digitalnurse.in";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/login", "/clinic", "/agency"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
