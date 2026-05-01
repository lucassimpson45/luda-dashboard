/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remote hosts only — files in /public (e.g. /luda-no-background.png) are always allowed.
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'retellai.com', pathname: '/**' }],
  },
}

module.exports = nextConfig
