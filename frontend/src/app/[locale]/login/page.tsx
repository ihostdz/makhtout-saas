import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { LoginForm } from '@/components/LoginForm'

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'metadata' })
  return {
    title: `Connexion — ${t('title')}`,
    description: t('description'),
  }
}

export default function LoginPage() {
  return <LoginForm />
}
