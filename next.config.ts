import type { NextConfig } from "next";
import { eventImageRemotePatterns } from "./src/lib/image-hosts";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: eventImageRemotePatterns,
  },
  async redirects() {
    return [
      { source: "/weekend", destination: "/fun", permanent: true },
      { source: "/weekend/:path*", destination: "/fun", permanent: true },
    ];
  },
};

export default nextConfig;
