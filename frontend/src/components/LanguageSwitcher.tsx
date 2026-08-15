'use client'

import { usePathname, useRouter, locales } from '@/navigation'

export function LanguageSwitcher() {
  const pathname = usePathname()
  const router = useRouter()

  const switchLocale = (locale: string) => {
    router.push(pathname, { locale })
  }

  return (
    <div className="flex items-center gap-1 rounded-full border bg-muted p-1">
      {locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          className="rounded-full px-3 py-1 text-xs font-medium transition-colors hover:bg-background"
        >
          {locale === 'fr' ? 'FR' : 'AR'}
        </button>
      ))}
    </div>
  )
}
