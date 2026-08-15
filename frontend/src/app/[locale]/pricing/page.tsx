import type { Metadata } from 'next'
import { Pricing } from '@/components/Pricing'

export const metadata: Metadata = {
  title: 'Tarifs — Makhtout',
  description: 'Plans d\'abonnement Makhtout : gratuit, Pro et Entreprise. Paiement par Chargily en Algérie et PayPal à l\'international.',
  alternates: {
    languages: {
      fr: '/fr/pricing',
      ar: '/ar/pricing',
    },
  },
  openGraph: {
    title: 'Tarifs Makhtout',
    description: 'Reconnaissance de manuscrits arabes et français propulsée par l\'IA.',
    type: 'website',
  },
}

export default function PricingPage() {
  return <Pricing />
}
