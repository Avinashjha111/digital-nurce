import type { MetadataRoute } from "next";

const SITE_URL = "https://digitalnurse.in";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/about", "/pricing", "/contact", "/privacy-policy", "/terms"];

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
  }));
}
