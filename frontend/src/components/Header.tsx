'use client'

import { useTranslations } from 'next-intl'
import { Link } from '@/navigation'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useAuth } from '@/context/AuthContext'
import { PenLine } from 'lucide-react'

export function Header() {
  const t = useTranslations('nav')
  const { user, logout } = useAuth()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
          <PenLine className="h-6 w-6" />
          <span>Makhtout</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="/" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t('home')}
          </Link>
          <Link href="/#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t('features')}
          </Link>
          <Link href="/#pricing" className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            {t('pricing')}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <>
              <Link href="/dashboard" className="hidden text-sm font-medium text-muted-foreground hover:text-foreground md:block">
                {t('dashboard')}
              </Link>
              {user.is_admin && (
                <Link href="/admin/corrections" className="hidden text-sm font-medium text-primary hover:text-primary/80 md:block">
                  Admin
                </Link>
              )}
              <Button variant="ghost" size="sm" onClick={logout}>
                {t('logout')}
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm" className="hidden md:flex">
                  {t('login')}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">{t('startFree')}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
