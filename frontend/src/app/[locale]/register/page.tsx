import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { RegisterForm } from '@/components/RegisterForm'

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'metadata' })
  return {
    title: `Inscription — ${t('title')}`,
    description: t('description'),
  }
}

export default function RegisterPage() {
  return <RegisterForm />
}
