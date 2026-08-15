'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Upload, File, X, Camera } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FileUploaderProps {
  onUpload: (file: File, languageHint: string) => Promise<void>
  isUploading: boolean
}

export function FileUploader({ onUpload, isUploading }: FileUploaderProps) {
  const t = useTranslations('uploader')
  const [file, setFile] = useState<File | null>(null)
  const [languageHint, setLanguageHint] = useState('auto')

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0])
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.tiff'],
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
    disabled: isUploading,
  })

  const handleUpload = async () => {
    if (!file) return
    await onUpload(file, languageHint)
    setFile(null)
  }

  const handleCameraCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={cn(
          'cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors sm:p-8',
          isDragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          isUploading && 'cursor-not-allowed opacity-60'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-4 text-sm font-medium">
          {isDragActive ? 'Drop the file here' : t('dragDrop')}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('orClick')}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">{t('supported')}</p>
      </div>

      <div className="flex justify-center">
        <label className="flex cursor-pointer items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted">
          <Camera className="h-4 w-4" />
          Prendre une photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleCameraCapture}
            className="hidden"
            disabled={isUploading}
          />
        </label>
      </div>

      {file && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <File className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              onClick={() => setFile(null)}
              disabled={isUploading}
              className="rounded-full p-1 hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            <label className="mb-2 block text-sm font-medium">{t('languageHint')}</label>
            <Select
              value={languageHint}
              onChange={(e) => setLanguageHint(e.target.value)}
              disabled={isUploading}
            >
              <option value="auto">Auto</option>
              <option value="ar">العربية</option>
              <option value="fr">Français</option>
            </Select>
          </div>

          <Button
            onClick={handleUpload}
            disabled={isUploading}
            className="mt-4 w-full"
          >
            {isUploading ? 'Uploading...' : t('upload')}
          </Button>
        </div>
      )}
    </div>
  )
}
