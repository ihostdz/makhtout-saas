'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Link } from '@/navigation'
import { Sparkles, ArrowRight, Play } from 'lucide-react'

export function Hero() {
  const t = useTranslations('hero')

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 to-background py-24 md:py-32">
      <div className="container relative z-10 mx-auto px-4 text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
          <Sparkles className="h-4 w-4" />
          {t('badge')}
        </div>

        <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          {t('title')}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
          {t('description')}
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/register">
            <Button size="lg" className="gap-2">
              {t('ctaPrimary')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#how-it-works">
            <Button size="lg" variant="outline" className="gap-2">
              <Play className="h-4 w-4" />
              {t('ctaSecondary')}
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-16 max-w-5xl rounded-2xl border bg-card p-2 shadow-xl">
          <div className="aspect-[16/9] overflow-hidden rounded-xl bg-muted">
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-secondary p-8 text-center">
              <div className="space-y-4">
                <div className="text-3xl font-bold text-primary">مخطوط</div>
                <p className="text-muted-foreground">Interface de transcription en temps réel</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
