import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    serverActions: {
      // Załącznik (do 4 MB, patrz MAX_ATTACHMENT_BYTES) plus narzut multipart.
      // Wyżej i tak nie ma sensu: Vercel odrzuca żądania większe niż 4,5 MB.
      bodySizeLimit: "4.4mb",
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Aplikacja nie ma prawa działać w cudzej ramce (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Wewnętrzne narzędzie — nie powinno trafić do wyszukiwarek.
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
