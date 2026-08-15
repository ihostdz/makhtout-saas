'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Check, Loader2 } from 'lucide-react'
import { useRouter } from '@/navigation'
import { ManualPaymentForm } from '@/components/ManualPaymentForm'

interface Plan {
  id: string
  slug: string
  name_fr: string
  name_ar: string
  description_fr: string
  description_ar: string
  price_da: number | null
  price_usd: number | null
  billing_interval: string | null
  pages_per_month: number
  features: string[]
}

export function Pricing() {
  const t = useTranslations('pricing')
  const { user } = useAuth()
  const router = useRouter()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)
  const [manualPaymentPlan, setManualPaymentPlan] = useState<Plan | null>(null)

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const data = await api.billing.plans()
      setPlans(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCheckout = async (planSlug: string, provider: string) => {
    if (!user) {
      router.push('/register')
      return
    }

    if (planSlug === 'enterprise') {
      router.push('/contact')
      return
    }

    setCheckoutLoading(`${planSlug}-${provider}`)
    try {
      const result = await api.billing.checkout(planSlug, provider)
      if (result.checkout_url) {
        window.location.href = result.checkout_url
      }
    } catch (error: any) {
      alert(error.message || 'Checkout failed')
    } finally {
      setCheckoutLoading(null)
    }
  }

  if (isLoading) {
    return (
      <section id="pricing" className="border-t bg-muted/30 py-24">
        <div className="container mx-auto px-4 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </section>
    )
  }

  return (
    <section id="pricing" className="border-t bg-muted/30 py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{t('subtitle')}</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.slug}
              className={`flex flex-col ${plan.slug === 'pro_monthly' ? 'border-primary shadow-lg ring-1 ring-primary' : ''}`}
            >
              <CardHeader>
                <CardDescription className="text-base font-medium">{plan.name_fr}</CardDescription>
                <CardTitle className="text-4xl">
                  {plan.price_da ? `${plan.price_da.toLocaleString()} DA` : plan.price_usd ? `$${plan.price_usd}` : 'Sur mesure'}
                  {plan.billing_interval && (
                    <span className="text-base font-normal text-muted-foreground">
                      /{plan.billing_interval === 'year' ? 'an' : 'mois'}
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{plan.description_fr}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="mb-4 text-sm font-medium text-primary">{plan.pages_per_month.toLocaleString()} pages/mois</p>
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <span className="text-sm text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                {plan.slug === 'free' ? (
                  <Button className="w-full" variant="outline" onClick={() => router.push(user ? '/dashboard' : '/register')}>
                    {user ? 'Mon plan actuel' : t('cta')}
                  </Button>
                ) : plan.slug === 'enterprise' ? (
                  <Button className="w-full" variant="outline" onClick={() => setManualPaymentPlan(plan)}>
                    Nous contacter
                  </Button>
                ) : (
                  <>
                    <Button
                      className="w-full"
                      onClick={() => handleCheckout(plan.slug, 'chargily')}
                      disabled={!!checkoutLoading}
                    >
                      {checkoutLoading === `${plan.slug}-chargily` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Payer avec Chargily
                    </Button>
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => handleCheckout(plan.slug, 'paypal')}
                      disabled={!!checkoutLoading}
                    >
                      {checkoutLoading === `${plan.slug}-paypal` ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      PayPal (hors Algérie)
                    </Button>
                    <Button
                      className="w-full"
                      variant="ghost"
                      onClick={() => setManualPaymentPlan(plan)}
                      disabled={!!checkoutLoading}
                    >
                      Paiement CIB/virement
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {manualPaymentPlan && (
          <div className="mx-auto mt-8 max-w-md">
            <ManualPaymentForm
              planSlug={manualPaymentPlan.slug}
              amount={manualPaymentPlan.price_da || manualPaymentPlan.price_usd || 0}
              currency={manualPaymentPlan.price_da ? 'DZD' : 'USD'}
              onSuccess={() => setManualPaymentPlan(null)}
              onCancel={() => setManualPaymentPlan(null)}
            />
          </div>
        )}
      </div>
    </section>
  )
}
