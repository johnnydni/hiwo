import type { NextConfig } from "next";

// Static export so hiwo can be hosted on GitHub Pages (no server).
// All data access goes from the browser to Supabase; row level security protects it.
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
