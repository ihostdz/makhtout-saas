'use client'

import { useTranslations } from 'next-intl'
import { Upload, FileSearch, Edit3, Download } from 'lucide-react'

const steps = [
  { key: 'upload', icon: Upload },
  { key: 'recognize', icon: FileSearch },
  { key: 'correct', icon: Edit3 },
  { key: 'export', icon: Download },
]

export function HowItWorks() {
  const t = useTranslations('howItWorks')

  return (
    <section id="how-it-works" className="border-t bg-muted/30 py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div key={step.key} className="relative text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Icon className="h-7 w-7" />
                </div>
                <div className="mt-4 text-xl font-bold text-muted-foreground/50">0{idx + 1}</div>
                <h3 className="mt-2 text-lg font-semibold">{t(`${step.key}.title`)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(`${step.key}.description`)}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
