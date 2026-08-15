'use client'

import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Building2, BookOpen, ScrollText, Landmark } from 'lucide-react'

const icons = {
  archives: ScrollText,
  research: BookOpen,
  administration: Building2,
  banks: Landmark,
}

export function UseCases() {
  const t = useTranslations('useCases')
  const keys = ['archives', 'research', 'administration', 'banks'] as const

  return (
    <section id="use-cases" className="bg-muted/50 py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {keys.map((key) => {
            const Icon = icons[key]
            return (
              <Card key={key} className="transition-shadow hover:shadow-lg">
                <CardHeader>
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle>{t(`${key}.title`)}</CardTitle>
                  <CardDescription>{t(`${key}.description`)}</CardDescription>
                </CardHeader>
                <CardContent />
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
