/** @type {import('next').NextConfig} */
const nextConfig = {
  // Static export is only needed for Capacitor Android build, not web deployment
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
