import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "raw.githubusercontent.com",
        pathname: "/**",
      },
    ],
  },
  async rewrites() {
    return [
      {
        // Rewrite for the Farcaster .well-known directory
        source: '/.well-known/farcaster.json',
        destination: '/api/farcaster.json',
      },
    ];
  },
};

export default nextConfig;
