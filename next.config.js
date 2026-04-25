/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow Retell & N8N domains for any future image/media
  images: {
    domains: ['retellai.com'],
  },
}

module.exports = nextConfig
