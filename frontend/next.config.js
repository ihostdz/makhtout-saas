const createNextIntlPlugin = require('next-intl/plugin')

const withNextIntl = createNextIntlPlugin('./i18n.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['localhost', 'makhtout.pro', 'www.makhtout.pro'],
    unoptimized: process.env.NODE_ENV === 'production',
  },
}

module.exports = withNextIntl(nextConfig)
