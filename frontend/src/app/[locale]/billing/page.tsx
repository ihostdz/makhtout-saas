'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Link } from '@/navigation'
import { Loader2, AlertCircle } from 'lucide-react'

interface Plan {
  id: string
  slug: string
  name_fr: string
  name_ar: string
  pages_per_month: number
}

interface BillingInfo {
  subscription: {
    status: string
    payment_provider: string
    expires_at: string
  } | null
  plan: Plan | null
  pages_used_this_month: number
  pages_limit: number
  remaining_pages: number
}

export default function BillingPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [info, setInfo] = useState<BillingInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      loadBillingInfo()
    }
  }, [user, authLoading, router])

  const loadBillingInfo = async () => {
    try {
      const data = await api.billing.info()
      setInfo(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || !info) return null

  const percentage = Math.min(100, (info.pages_used_this_month / info.pages_limit) * 100)

  return (
    <div className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">Mon abonnement</h1>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Plan actuel</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium">{info.plan?.name_fr}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Statut</span>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                {info.subscription?.status || 'active'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Passerelle</span>
              <span className="font-medium capitalize">{info.subscription?.payment_provider || 'none'}</span>
            </div>
            {info.subscription?.expires_at && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Expire le</span>
                <span className="font-medium">{new Date(info.subscription.expires_at).toLocaleDateString()}</span>
              </div>
            )}
            <Link href="/pricing">
              <Button className="mt-4 w-full">Changer de plan</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quota de pages</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Utilisé ce mois</span>
              <span className="font-medium">
                {info.pages_used_this_month} / {info.pages_limit}
              </span>
            </div>
            <Progress value={percentage} className="h-2" />
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Restant</span>
              <span className="font-medium">{info.remaining_pages} pages</span>
            </div>
            {info.remaining_pages === 0 && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                Vous avez atteint votre quota. Passez à un plan supérieur.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
