import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    staleTimes: {
      dynamic: 0,
    }
  },
  images: {
    unoptimized: true, 
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.sportmonks.com'
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com'
      },
    ],
  },
};

export default nextConfig;
