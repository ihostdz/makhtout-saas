'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles } from 'lucide-react'

interface WordSuggestionsProps {
  word: string
  context: string
  languageHint: string
  onSelect: (suggestion: string) => void
}

export function WordSuggestions({ word, context, languageHint, onSelect }: WordSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const loadSuggestions = async () => {
    setIsLoading(true)
    setError('')
    try {
      const result = await api.ocr.suggest(word, context, languageHint)
      setSuggestions(result.suggestions)
    } catch (err: any) {
      setError(err.message || 'Failed to load suggestions')
    } finally {
      setIsLoading(false)
    }
  }

  if (suggestions.length === 0 && !isLoading) {
    return (
      <div className="rounded-md border bg-card p-3">
        <Button variant="ghost" size="sm" onClick={loadSuggestions} className="h-auto w-full justify-start gap-2 p-0">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm">Suggest with AI</span>
        </Button>
        {error && <p className="mt-2 text-xs text-destructive">{error}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-md border bg-card p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Sparkles className="h-3 w-3 text-primary" />
        AI Suggestions
      </div>
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      ) : (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(suggestion)}
              className="rounded-full bg-primary/10 px-3 py-1 text-sm text-primary transition-colors hover:bg-primary/20"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
