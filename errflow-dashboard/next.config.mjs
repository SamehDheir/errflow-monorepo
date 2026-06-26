/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    turbo: {
      // Disable Turbopack due to known issues with Next.js 16.2.3
      loaders: {},
    },
  },
}

export default nextConfig
