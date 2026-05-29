import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fixa a raiz do workspace neste projeto (havia outros lockfiles na home).
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
