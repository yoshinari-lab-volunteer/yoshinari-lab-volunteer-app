import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // Supabase Storage の画像を next/image で最適化する
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/**' }],
    // Vercel 無料枠の画像最適化回数を節約するため、必要なサイズだけに絞る
    imageSizes: [96, 192],
    deviceSizes: [640, 828, 1200],
  },
};

export default nextConfig;
