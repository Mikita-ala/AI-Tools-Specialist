import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@gbc/domain", "@gbc/integrations"],
  turbopack: {
    root: "C:/Users/orys/project/gbc-analytics-dashboard",
  },
};

export default nextConfig;
