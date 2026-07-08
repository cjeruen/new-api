/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Copy, ExternalLink, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'

import { isAuthenticatedVideoProxyUrl } from '../../lib/task-logs-cells'

interface VideoPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  videoUrl: string
}

export function VideoPreviewDialog({
  open,
  onOpenChange,
  videoUrl,
}: VideoPreviewDialogProps) {
  const { t } = useTranslation()
  const [hasError, setHasError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [playbackUrl, setPlaybackUrl] = useState(videoUrl)
  const needsAuth = isAuthenticatedVideoProxyUrl(videoUrl)

  useEffect(() => {
    if (!open) {
      return
    }

    setHasError(false)
    setIsLoading(true)
    setPlaybackUrl(videoUrl)

    if (!needsAuth) {
      return
    }

    const controller = new AbortController()
    let objectUrl: string | null = null

    fetch(videoUrl, { credentials: 'include', signal: controller.signal })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        return response.blob()
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        setPlaybackUrl(objectUrl)
      })
      .catch(() => {
        setHasError(true)
        setIsLoading(false)
      })

    return () => {
      controller.abort()
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [open, videoUrl, needsAuth])

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <>
          <Video className='h-5 w-5' />
          {t('Video')} {t('Preview')}
        </>
      }
      contentClassName='sm:max-w-2xl'
      titleClassName='flex items-center gap-2'
      contentHeight='auto'
      bodyClassName='space-y-4'
    >
      {hasError ? (
        <div className='space-y-3 py-6 text-center'>
          <p className='text-muted-foreground text-sm'>
            {t('Failed')}
          </p>
          <div className='flex flex-wrap items-center justify-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5'
              onClick={() => window.open(videoUrl, '_blank')}
            >
              <ExternalLink className='h-3.5 w-3.5' />
              {t('Open in new tab')}
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='gap-1.5'
              onClick={() => {
                navigator.clipboard.writeText(videoUrl)
                toast.success(t('Copied'))
              }}
            >
              <Copy className='h-3.5 w-3.5' />
              {t('Copy Link')}
            </Button>
          </div>
        </div>
      ) : (
        <div className='relative overflow-hidden rounded-lg border bg-black/95'>
          {isLoading && (
            <div className='text-muted-foreground absolute inset-0 flex items-center justify-center text-sm'>
              {t('Loading...')}
            </div>
          )}
          <video
            key={playbackUrl}
            src={playbackUrl}
            controls
            playsInline
            className='max-h-[60vh] w-full'
            onLoadedData={() => setIsLoading(false)}
            onError={() => {
              setHasError(true)
              setIsLoading(false)
            }}
          />
        </div>
      )}
    </Dialog>
  )
}