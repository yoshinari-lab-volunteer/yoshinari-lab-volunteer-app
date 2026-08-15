import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 画像は Cloudinary 側で f_auto/q_auto/リサイズ済みのURLを配信しているため、
  // next/image は使わず通常の <img> で表示している（二重最適化を避けるため）。
  serverExternalPackages: ['firebase-admin'],
};

export default nextConfig;
