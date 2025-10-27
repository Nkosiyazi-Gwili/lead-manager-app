/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://lead-manager-back-end-app-i5rw.vercel.app/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;