/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://lead-manager-backend-app-piyv.vercel.app/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;