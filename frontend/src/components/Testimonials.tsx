'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent } from '@/components/ui/card'
import { Quote } from 'lucide-react'

export function Testimonials() {
  const t = useTranslations('testimonials')
  const keys = ['archivist', 'researcher', 'administration']

  return (
    <section id="testimonials" className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {keys.map((key) => (
            <Card key={key} className="relative">
              <CardContent className="pt-8">
                <Quote className="absolute right-6 top-6 h-8 w-8 text-primary/20" />
                <p className="mb-4 text-muted-foreground">{t(`${key}.quote`)}</p>
                <div>
                  <p className="font-semibold">{t(`${key}.name`)}</p>
                  <p className="text-sm text-muted-foreground">{t(`${key}.role`)}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
