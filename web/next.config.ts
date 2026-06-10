import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Export statique : l'UI est 100% client, servie par le serveur Hono en prod.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
