import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
  // @ts-ignore
  allowedDevOrigins: [
    "873fe833d5eb.ngrok-free.app",
    "100.119.111.27:3000",
    "localhost:3000",
    "https://100.119.111.27:3000",
    "https://localhost:3000",
    "http://100.119.111.27:3000",
    "http://100.x.x.x:3000",
    "http://localhost:3000"
  ],
  turbopack: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=*",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
