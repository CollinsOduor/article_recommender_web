import type { NextConfig } from "next";

const recommenderApiUrl = (
  process.env.RECOMMENDER_API_URL ?? "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/recommender/:path*",
        destination: `${recommenderApiUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
