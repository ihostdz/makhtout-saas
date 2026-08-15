import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { locales } from '@/navigation'
import { AuthProvider } from '@/context/AuthContext'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode
  params: { locale: string }
}) {
  if (!locales.includes(locale)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()
  const isArabic = locale === 'ar'

  return (
    <html lang={locale} dir={isArabic ? 'rtl' : 'ltr'}>
      <body className={`${isArabic ? 'font-arabic' : 'font-sans'} min-h-screen antialiased`}>
        <NextIntlClientProvider messages={messages} locale={locale}>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
