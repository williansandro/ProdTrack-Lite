import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
       {
        protocol: "https",
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        hostname: "source.unsplash.com",
      }
    ],
  },
  experimental: {
    // serverActions are stable in Next.js 14+ and enabled by default.
    // This can be removed if using Next.js 14 or later where it's default.
    // serverActions: true, // For older Next.js versions.
  }
};

export default nextConfig;
