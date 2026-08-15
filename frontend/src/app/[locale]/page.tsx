import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Hero } from '@/components/Hero'
import { Features } from '@/components/Features'
import { HowItWorks } from '@/components/HowItWorks'
import { UseCases } from '@/components/UseCases'
import { Pricing } from '@/components/Pricing'
import { Testimonials } from '@/components/Testimonials'
import { FAQ } from '@/components/FAQ'

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'metadata' })
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://makhtout.dz'
  const title = t('title')
  const description = t('description')

  return {
    title,
    description,
    keywords: t('keywords'),
    authors: [{ name: 'Makhtout' }],
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        fr: '/fr',
        ar: '/ar',
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${locale}`,
      siteName: 'Makhtout',
      locale: locale === 'ar' ? 'ar_DZ' : 'fr_DZ',
      type: 'website',
      images: [
        {
          url: `${baseUrl}/og-image.png`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/og-image.png`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  }
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                name: 'Makhtout',
                url: process.env.NEXT_PUBLIC_APP_URL || 'https://makhtout.dz',
                logo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://makhtout.dz'}/icon-192x192.png`,
                sameAs: [
                  'https://www.linkedin.com/company/makhtout',
                  'https://twitter.com/makhtout',
                ],
              },
              {
                '@type': 'SoftwareApplication',
                name: 'Makhtout',
                applicationCategory: 'BusinessApplication',
                operatingSystem: 'Web',
                offers: {
                  '@type': 'Offer',
                  price: '0',
                  priceCurrency: 'DZD',
                },
                aggregateRating: {
                  '@type': 'AggregateRating',
                  ratingValue: '4.8',
                  ratingCount: '127',
                },
                inLanguage: ['fr', 'ar'],
                availableLanguage: [
                  { '@type': 'Language', name: 'French' },
                  { '@type': 'Language', name: 'Arabic' },
                ],
              },
            ],
          }),
        }}
      />
      <Hero />
      <Features />
      <HowItWorks />
      <UseCases />
      <Pricing />
      <Testimonials />
      <FAQ />
    </>
  )
}
