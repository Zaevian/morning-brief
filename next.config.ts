import type { NextConfig } from "next";
import { eventImageRemotePatterns } from "./src/lib/image-hosts";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: eventImageRemotePatterns,
  },
};

export default nextConfig;
