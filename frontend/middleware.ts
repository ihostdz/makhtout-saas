import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['fr', 'ar'],
  defaultLocale: 'fr',
  localePrefix: 'always',
})

export const config = {
  matcher: ['/((?!api|_next|.*\\..*).*)'],
}
