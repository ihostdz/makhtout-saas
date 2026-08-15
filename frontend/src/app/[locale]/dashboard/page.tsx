'use client'

import { useEffect, useState } from 'react'
import { useRouter } from '@/navigation'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileUploader } from '@/components/FileUploader'
import { Link } from '@/navigation'
import { useTranslations } from 'next-intl'
import { FileText, Plus, Loader2, CreditCard } from 'lucide-react'

interface Document {
  id: string
  original_filename: string
  status: string
  created_at: string
}

export default function DashboardPage() {
  const t = useTranslations()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [billingInfo, setBillingInfo] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [showUploader, setShowUploader] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }
    if (user) {
      loadDocuments()
    }
  }, [user, authLoading, router])

  const loadDocuments = async () => {
    try {
      const [docs, billing] = await Promise.all([
        api.documents.list(),
        api.billing.info(),
      ])
      setDocuments(docs)
      setBillingInfo(billing)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpload = async (file: File, languageHint: string) => {
    setIsUploading(true)
    try {
      const doc = await api.documents.upload(file, languageHint)
      router.push(`/documents/${doc.id}`)
    } catch (error: any) {
      alert(error.message || 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="container py-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          {billingInfo && (
            <Link href="/billing">
              <Button variant="outline" size="sm">
                <CreditCard className="mr-2 h-4 w-4" />
                {billingInfo.pages_used_this_month}/{billingInfo.pages_limit} pages
              </Button>
            </Link>
          )}
          <Button onClick={() => setShowUploader(!showUploader)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.newDocument')}
          </Button>
        </div>
      </div>

      {showUploader && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg">{t('uploader.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUploader onUpload={handleUpload} isUploading={isUploading} />
          </CardContent>
        </Card>
      )}

      {documents.length === 0 ? (
        <Card className="py-12 text-center">
          <CardContent>
            <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-medium">{t('dashboard.noDocuments')}</h3>
            <p className="text-sm text-muted-foreground">{t('dashboard.uploadFirst')}</p>
            <Button className="mt-4" onClick={() => setShowUploader(true)}>
              {t('dashboard.upload')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <Link key={doc.id} href={`/documents/${doc.id}`}>
              <Card className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="truncate text-base">{doc.original_filename}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        doc.status === 'processed'
                          ? 'bg-green-100 text-green-800'
                          : doc.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {t(`dashboard.status.${doc.status}`)}
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
