'use client'

import { useTranslations } from 'next-intl'
import { PenLine } from 'lucide-react'

export function Footer() {
  const t = useTranslations('footer')

  return (
    <footer className="border-t bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2 text-xl font-bold text-primary">
            <PenLine className="h-6 w-6" />
            <span>Makhtout</span>
          </div>
          <p className="max-w-md text-center text-sm text-muted-foreground md:text-right">{t('tagline')}</p>
        </div>
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          {t('copyright')}
        </div>
      </div>
    </footer>
  )
}
