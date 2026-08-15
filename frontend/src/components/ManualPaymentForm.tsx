'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface ManualPaymentFormProps {
  planSlug: string
  amount: number
  currency: string
  onSuccess: () => void
  onCancel: () => void
}

export function ManualPaymentForm({ planSlug, amount, currency, onSuccess, onCancel }: ManualPaymentFormProps) {
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      const result = await api.billing.manualPayment(planSlug, reference, amount, currency, notes)
      setMessage(result.message)
      onSuccess()
    } catch (err: any) {
      setMessage(err.message || 'Submission failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-lg">Paiement manuel</CardTitle>
      </CardHeader>
      <CardContent>
        {message ? (
          <div className="rounded-md bg-primary/10 p-3 text-sm text-primary">{message}</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="font-medium">Instructions :</p>
              <p>Effectuez un virement de {amount.toLocaleString()} {currency} vers notre compte.</p>
              <p className="mt-1 text-muted-foreground">Référence : {planSlug}</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Référence / Numéro de transaction</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Ex: TR123456789"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Nom du titulaire du compte..."
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading} className="flex-1">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirmer
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
