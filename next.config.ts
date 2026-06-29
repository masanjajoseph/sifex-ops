import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["bullmq", "ioredis", "prom-client"],
  experimental: {
    serverMinification: true,
    serverSourceMaps: false,
    optimizePackageImports: ["lucide-react", "@radix-ui/react-popover"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "sifex-prod.s3.amazonaws.com" },
    ],
  },
  headers: async () => [
    {
      source: "/api/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store, must-revalidate" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
      ],
    },
    {
      source: "/api/metrics",
      headers: [
        { key: "Cache-Control", value: "no-store" },
      ],
    },
  ],
};

export default nextConfig;
