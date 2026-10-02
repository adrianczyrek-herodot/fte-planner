import type { MetadataRoute } from "next";

// Wewnętrzne narzędzie firmy — żadna jego strona nie powinna być indeksowana.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
