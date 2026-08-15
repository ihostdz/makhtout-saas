'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check, X, Download } from 'lucide-react'

interface Correction {
  id: string
  original_value: string
  corrected_value: string
  word_position: number | null
  is_validated_by_admin: boolean
  is_rejected_by_admin: boolean
  created_at: string
  transcription_id: string
}

export default function AdminCorrectionsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [corrections, setCorrections] = useState<Correction[]>([])
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
      loadCorrections()
    }
  }, [user, authLoading, router])

  const loadCorrections = async () => {
    try {
      const data = await api.admin.corrections()
      setCorrections(data)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleValidate = async (id: string) => {
    try {
      await api.admin.validateCorrection(id)
      setCorrections(corrections.filter((c) => c.id !== id))
    } catch (error: any) {
      alert(error.message || 'Failed to validate')
    }
  }

  const handleReject = async (id: string) => {
    try {
      await api.admin.rejectCorrection(id)
      setCorrections(corrections.filter((c) => c.id !== id))
    } catch (error: any) {
      alert(error.message || 'Failed to reject')
    }
  }

  const handleExport = async (format: string) => {
    try {
      const response = await api.admin.exportCorrections(format)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `corrections.${format === 'csv' ? 'csv' : 'json'}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      alert(error.message || 'Export failed')
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Corrections en attente</h1>
          <p className="text-muted-foreground">Validez ou rejetez les corrections proposées par les utilisateurs</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport('json')}>
            <Download className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
          <Button variant="outline" onClick={() => handleExport('csv')}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {corrections.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <Check className="mx-auto h-12 w-12 text-green-500" />
            <h3 className="mt-4 text-lg font-medium">Aucune correction en attente</h3>
            <p className="text-sm text-muted-foreground">Toutes les corrections ont été traitées.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {corrections.map((correction) => (
            <Card key={correction.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Correction #{correction.id.slice(0, 8)}</CardTitle>
                  <Badge variant="outline">{new Date(correction.created_at).toLocaleString()}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Original</p>
                    <p className="rounded-md bg-muted p-3 font-mono text-sm">{correction.original_value}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Correction proposée</p>
                    <p className="rounded-md bg-primary/5 p-3 font-mono text-sm text-primary">
                      {correction.corrected_value}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleReject(correction.id)}>
                    <X className="mr-2 h-4 w-4" />
                    Rejeter
                  </Button>
                  <Button size="sm" onClick={() => handleValidate(correction.id)}>
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
