'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X } from 'lucide-react'

interface Payment {
  id: string
  user_email: string
  amount: number
  currency: string
  provider: string
  metadata: {
    reference?: string
    notes?: string
  }
  created_at: string
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (!authLoading && user && !user.is_admin) {
      router.push('/dashboard')
      return
    }
    if (user?.is_admin) {
      loadPayments()
    }
  }, [user, authLoading, router])

  const loadPayments = async () => {
    try {
      const data = await api.admin.payments()
      setPayments(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleValidate = async (id: string) => {
    try {
      await api.admin.validatePayment(id)
      setPayments(payments.filter((p) => p.id !== id))
    } catch (error: any) {
      alert(error.message || 'Failed to validate')
    }
  }

  const handleReject = async (id: string) => {
    try {
      await api.admin.rejectPayment(id)
      setPayments(payments.filter((p) => p.id !== id))
    } catch (error: any) {
      alert(error.message || 'Failed to reject')
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user?.is_admin) return null

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Paiements en attente</h1>
        <p className="text-muted-foreground">Validez ou rejetez les paiements manuels</p>
      </div>

      {payments.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <Check className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">Aucun paiement en attente</h3>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {payments.map((payment) => (
            <Card key={payment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Paiement #{payment.id.slice(0, 8)}</CardTitle>
                  <Badge variant="outline">{new Date(payment.created_at).toLocaleString()}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <p><span className="text-muted-foreground">Utilisateur:</span> {payment.user_email}</p>
                  <p><span className="text-muted-foreground">Montant:</span> {payment.amount} {payment.currency}</p>
                  <p><span className="text-muted-foreground">Méthode:</span> {payment.provider}</p>
                  <p><span className="text-muted-foreground">Référence:</span> {payment.metadata?.reference || '-'}</p>
                  {payment.metadata?.notes && (
                    <p className="md:col-span-2"><span className="text-muted-foreground">Notes:</span> {payment.metadata.notes}</p>
                  )}
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleReject(payment.id)}>
                    <X className="mr-2 h-4 w-4" />
                    Rejeter
                  </Button>
                  <Button size="sm" onClick={() => handleValidate(payment.id)}>
                    <Check className="mr-2 h-4 w-4" />
                    Valider
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
