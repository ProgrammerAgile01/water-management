import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//   /* config options here */
// };

const nextConfig: NextConfig = {
  devIndicators: {
    buildActivity: false, // sembunyikan indikator aktivitas build
  },
};

export default nextConfig;