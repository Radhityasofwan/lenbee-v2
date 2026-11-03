import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build host punya limit thread OS rendah — default worker count Next.js (= jumlah CPU
  // host, bukan container) bikin build crash dengan "OS can't spawn worker thread".
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
};

export default nextConfig;
