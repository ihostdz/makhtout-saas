import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'

export const locales = ['fr', 'ar']
export const defaultLocale = 'fr'

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale

  if (!locale || !locales.includes(locale)) {
    notFound()
  }

  return {
    locale,
    messages: (await import(`./src/i18n/messages/${locale}.json`)).default,
  }
})
