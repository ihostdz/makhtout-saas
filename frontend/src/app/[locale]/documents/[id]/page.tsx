'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from '@/navigation'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Link } from '@/navigation'
import { WordSuggestions } from '@/components/WordSuggestions'
import { useTranslations } from 'next-intl'
import Image from 'next/image'
import { ArrowLeft, Download, FileText, Loader2, Save, Sparkles } from 'lucide-react'

interface Document {
  id: string
  original_filename: string
  mime_type: string
  status: string
  language_hint: string
  created_at: string
}

interface WordDetail {
  text: string
  confidence: number
  bbox?: number[][]
}

interface Transcription {
  id: string
  mode: string
  raw_text: string
  corrected_text: string | null
  confidence: number
  processing_time_ms: number
  result_metadata?: {
    lines?: string[]
    words?: WordDetail[]
    characters?: { char: string; confidence: number }[]
  }
  created_at: string
}

const MODES = [
  { value: 'machine', label: 'Mode Machine' },
  { value: 'human', label: 'Mode Humain-like' },
  { value: 'words', label: 'Par mots' },
  { value: 'letters', label: 'Par lettres' },
  { value: 'context', label: 'Par contexte' },
]

export default function DocumentPage() {
  const t = useTranslations()
  const params = useParams()
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const documentId = params.id as string

  const [document, setDocument] = useState<Document | null>(null)
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([])
  const [selectedTranscription, setSelectedTranscription] = useState<Transcription | null>(null)
  const [editedText, setEditedText] = useState('')
  const [selectedWord, setSelectedWord] = useState('')
  const [mode, setMode] = useState('machine')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const loadDocument = useCallback(async () => {
    try {
      const [doc, trans] = await Promise.all([
        api.documents.get(documentId),
        api.ocr.transcriptions(documentId),
      ])
      setDocument(doc)
      setTranscriptions(trans)
      if (trans.length > 0) {
        const latest = trans[trans.length - 1]
        setSelectedTranscription(latest)
        setEditedText(latest.corrected_text || latest.raw_text)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [documentId])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (documentId && user) {
      loadDocument()
    }
  }, [documentId, user, loadDocument])

  const handleProcess = async () => {
    setIsProcessing(true)
    try {
      const transcription = await api.ocr.process(documentId, mode, document?.language_hint || 'auto')
      setTranscriptions([...transcriptions, transcription])
      setSelectedTranscription(transcription)
      setEditedText(transcription.raw_text)
      setDocument((prev) => (prev ? { ...prev, status: 'processed' } : prev))
    } catch (error: any) {
      alert(error.message || 'OCR failed')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSaveCorrection = async () => {
    if (!selectedTranscription) return
    setIsSaving(true)
    try {
      const updated = await api.ocr.correct(
        selectedTranscription.id,
        selectedTranscription.raw_text,
        editedText
      )
      setSelectedTranscription(updated)
      setTranscriptions(transcriptions.map((t) => (t.id === updated.id ? updated : t)))
    } catch (error: any) {
      alert(error.message || 'Correction failed')
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async (format: 'txt' | 'docx' | 'pdf') => {
    setIsExporting(true)
    try {
      await api.documents.export(documentId, format)
    } catch (error: any) {
      alert(error.message || 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const handleWordSelect = () => {
    const selection = window.getSelection()?.toString().trim()
    if (selection) {
      setSelectedWord(selection)
    }
  }

  const replaceSelectedWord = (newWord: string) => {
    if (!selectedWord) return
    const regex = new RegExp(`\\b${selectedWord}\\b`, 'g')
    setEditedText(editedText.replace(regex, newWord))
    setSelectedWord('')
  }

  if (authLoading || isLoading) {
    return (
      <div className="container flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!document) return null

  const imageUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/documents/${documentId}/image`
  const words = selectedTranscription?.result_metadata?.words || []
  const lowConfidenceWords = words.filter((w) => w.confidence < 0.7)

  return (
    <div className="container py-6">
      <div className="mb-6 flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('document.back')}
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{document.original_filename}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(document.created_at).toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">{t('document.mode')}</label>
          <Select value={mode} onChange={(e) => setMode(e.target.value)} disabled={isProcessing}>
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={handleProcess} disabled={isProcessing}>
          {isProcessing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {isProcessing ? t('document.processing') : t('document.runOcr')}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{document.original_filename}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto rounded-lg border bg-muted">
              {document.mime_type === 'application/pdf' ? (
                <iframe
                  src={imageUrl}
                  className="h-[500px] w-full"
                  title={document.original_filename}
                />
              ) : (
                <div className="relative h-[500px] w-full">
                  <Image
                    src={imageUrl}
                    alt={document.original_filename}
                    fill
                    className="object-contain"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('document.transcription')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedTranscription ? (
              <>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    {t('document.confidence')}: {(selectedTranscription.confidence * 100).toFixed(1)}%
                  </span>
                  <span>
                    {t('document.processingTime')}: {selectedTranscription.processing_time_ms}ms
                  </span>
                  {lowConfidenceWords.length > 0 && (
                    <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                      {lowConfidenceWords.length} mots douteux
                    </span>
                  )}
                </div>

                {selectedWord && (
                  <WordSuggestions
                    word={selectedWord}
                    context={editedText}
                    languageHint={document.language_hint}
                    onSelect={replaceSelectedWord}
                  />
                )}

                {mode === 'words' && words.length > 0 && (
                  <div className="max-h-[120px] overflow-auto rounded-md border bg-muted/50 p-3">
                    <div className="flex flex-wrap gap-2">
                      {words.map((word, idx) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedWord(word.text)}
                          className={`rounded px-2 py-1 text-sm ${
                            word.confidence < 0.7
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                              : 'bg-secondary hover:bg-secondary/80'
                          }`}
                          title={`Confiance: ${(word.confidence * 100).toFixed(1)}%`}
                        >
                          {word.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Textarea
                  value={editedText}
                  onChange={(e) => setEditedText(e.target.value)}
                  onMouseUp={handleWordSelect}
                  className="min-h-[250px] font-mono text-base leading-relaxed"
                  dir="auto"
                />
                <Button
                  onClick={handleSaveCorrection}
                  disabled={isSaving || editedText === (selectedTranscription.corrected_text || selectedTranscription.raw_text)}
                  className="w-full"
                >
                  {isSaving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {t('document.saveCorrection')}
                </Button>

                {selectedTranscription.corrected_text && (
                  <p className="text-xs text-muted-foreground">{t('document.corrected')}</p>
                )}

                <div className="grid grid-cols-3 gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('txt')}
                    disabled={isExporting}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    TXT
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('docx')}
                    disabled={isExporting}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    DOCX
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExport('pdf')}
                    disabled={isExporting}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center text-center text-muted-foreground">
                <Sparkles className="mb-2 h-8 w-8" />
                <p>{t('document.noTranscription')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
