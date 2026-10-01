import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  assetPrefix: './',   // Electron file:// 로드 시 상대경로로 번들 로딩
  images: { unoptimized: true },
};

export default nextConfig;
