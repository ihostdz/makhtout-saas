'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function FAQ() {
  const t = useTranslations('faq')
  const keys = ['data', 'languages', 'payment', 'free']

  return (
    <section id="faq" className="border-t bg-muted/30 py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-4">
          {keys.map((key) => (
            <Card key={key}>
              <CardHeader>
                <CardTitle className="text-lg">{t(`${key}.question`)}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{t(`${key}.answer`)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
