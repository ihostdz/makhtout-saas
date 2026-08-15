import { MetadataRoute } from 'next'
import { locales } from '@/navigation'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://makhtout.dz'
  const routes = ['', '/pricing', '/login', '/register', '/dashboard', '/billing', '/blog']

  const entries: MetadataRoute.Sitemap = []

  for (const locale of locales) {
    for (const route of routes) {
      entries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'weekly' : 'monthly',
        priority: route === '' ? 1 : 0.8,
      })
    }
  }

  return entries
}
