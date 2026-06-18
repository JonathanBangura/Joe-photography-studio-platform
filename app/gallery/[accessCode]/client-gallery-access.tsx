'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { CheckCircle, ChevronLeft, ChevronRight, Download, Heart, ImageIcon, Loader2, Lock, Send, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

type GalleryStatus =
  | 'draft'
  | 'published'
  | 'selection_submitted'
  | 'editing'
  | 'final_uploaded'
  | 'delivered'
  | 'completed'

type PhotoStage = 'selection' | 'edited'

type GalleryPhotoRecord = {
  id: string
  gallery_id: string | null
  image_url: string
  thumbnail_url: string | null
  title: string | null
  is_selected: boolean | null
  photo_stage?: PhotoStage | null
  download_enabled?: boolean | null
  created_at: string
}

type GalleryRecord = {
  id: string
  title: string
  access_code: string | null
  expires_at: string | null
  is_active: boolean | null
  status?: GalleryStatus | null
}

type ClientGalleryAccessProps = {
  gallery: GalleryRecord
  photos: GalleryPhotoRecord[]
}

function getPhotoTitle(photo: GalleryPhotoRecord, index: number) {
  return photo.title || `Photo ${index + 1}`
}

function getStage(photo: GalleryPhotoRecord): PhotoStage {
  return photo.photo_stage === 'edited' ? 'edited' : 'selection'
}

function isSelectionLocked(status?: string | null) {
  return ['selection_submitted', 'editing', 'final_uploaded', 'delivered', 'completed'].includes(String(status || ''))
}

function canViewFinals(status?: string | null) {
  return ['delivered', 'completed'].includes(String(status || ''))
}

function statusCopy(status?: string | null) {
  switch (status) {
    case 'published':
      return {
        title: 'Select your favorite photos',
        description: 'Choose the proof photos you want the studio to edit. Downloads will be available after final delivery.',
      }
    case 'selection_submitted':
    case 'editing':
      return {
        title: 'Your selection is with the studio',
        description: 'Your chosen photos have been submitted. The team is now preparing your edited images.',
      }
    case 'final_uploaded':
      return {
        title: 'Final photos are being prepared',
        description: 'The studio has uploaded edited photos and is preparing the final delivery for download.',
      }
    case 'delivered':
    case 'completed':
      return {
        title: 'Your edited photos are ready',
        description: 'View and download your final edited photos below.',
      }
    default:
      return {
        title: 'Gallery is being prepared',
        description: 'The studio is preparing this private gallery. Please check back soon.',
      }
  }
}

function workflowStep(status?: string | null) {
  if (status === 'delivered' || status === 'completed') return 3
  if (status === 'selection_submitted' || status === 'editing' || status === 'final_uploaded') return 2
  return 1
}

function downloadAll(photos: GalleryPhotoRecord[]) {
  photos
    .filter((photo) => photo.download_enabled !== false)
    .forEach((photo, index) => {
      setTimeout(() => {
        const link = document.createElement('a')
        link.href = photo.image_url
        link.download = photo.title || `edited-photo-${index + 1}.jpg`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        link.remove()
      }, index * 250)
    })
}

export function ClientGalleryAccess({ gallery, photos: initialPhotos }: ClientGalleryAccessProps) {
  const initialStatus = gallery.status || (gallery.is_active ? 'published' : 'draft')
  const [currentStatus, setCurrentStatus] = useState(initialStatus)
  const [photos, setPhotos] = useState<GalleryPhotoRecord[]>(initialPhotos || [])
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [updatingPhotoId, setUpdatingPhotoId] = useState<string | null>(null)
  const [isSubmittingSelection, setIsSubmittingSelection] = useState(false)
  const [selectionSubmitted, setSelectionSubmitted] = useState(isSelectionLocked(initialStatus))

  const proofPhotos = useMemo(
    () =>
      photos
        .filter((photo) => getStage(photo) === 'selection')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [photos],
  )

  const finalPhotos = useMemo(
    () =>
      photos
        .filter((photo) => getStage(photo) === 'edited')
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [photos],
  )

  const effectiveStatus = currentStatus
  const visiblePhotos = canViewFinals(effectiveStatus) && finalPhotos.length > 0 ? finalPhotos : proofPhotos
  const selectedIndex = selectedPhotoId ? visiblePhotos.findIndex((photo) => photo.id === selectedPhotoId) : -1
  const selectedPhoto = selectedIndex >= 0 ? visiblePhotos[selectedIndex] : null
  const selectedCount = proofPhotos.filter((photo) => photo.is_selected).length
  const locked = isSelectionLocked(effectiveStatus) || selectionSubmitted
  const finalDeliveryReady = canViewFinals(effectiveStatus)
  const copy = statusCopy(effectiveStatus)
  const step = workflowStep(effectiveStatus)

  const goToPrevious = () => {
    if (selectedIndex > 0) setSelectedPhotoId(visiblePhotos[selectedIndex - 1].id)
  }

  const goToNext = () => {
    if (selectedIndex >= 0 && selectedIndex < visiblePhotos.length - 1) {
      setSelectedPhotoId(visiblePhotos[selectedIndex + 1].id)
    }
  }

  const updateLocalPhoto = (updatedPhoto: GalleryPhotoRecord) => {
    setPhotos((current) => current.map((photo) => (photo.id === updatedPhoto.id ? updatedPhoto : photo)))
  }

  const togglePhotoSelection = async (photo: GalleryPhotoRecord) => {
    if (locked) {
      toast.info('Selection has already been submitted to the studio')
      return
    }

    if (!gallery.access_code) {
      toast.error('Missing gallery access code')
      return
    }

    const nextValue = !photo.is_selected
    setUpdatingPhotoId(photo.id)

    try {
      const response = await fetch(`/api/gallery/${encodeURIComponent(gallery.access_code)}/selection`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photo_id: photo.id, is_selected: nextValue }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to update photo selection')

      updateLocalPhoto(result.photo as GalleryPhotoRecord)
      toast.success(nextValue ? 'Photo selected' : 'Photo removed from selection')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to update photo selection')
    } finally {
      setUpdatingPhotoId(null)
    }
  }

  const submitSelection = async () => {
    if (!gallery.access_code) {
      toast.error('Missing gallery access code')
      return
    }

    if (selectedCount === 0) {
      toast.error('Please select at least one photo before submitting')
      return
    }

    setIsSubmittingSelection(true)

    try {
      const response = await fetch(`/api/gallery/${encodeURIComponent(gallery.access_code)}/selection`, {
        method: 'POST',
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to submit selection')

      setSelectionSubmitted(true)
      setCurrentStatus('selection_submitted')
      toast.success(`Selection submitted: ${result.selected_count} photo${result.selected_count === 1 ? '' : 's'}`)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to submit selection')
    } finally {
      setIsSubmittingSelection(false)
    }
  }

  return (
    <section className="px-4 py-12">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 rounded-3xl border bg-card/70 p-6 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Badge className="mb-3" variant={finalDeliveryReady ? 'default' : 'secondary'}>
                {finalDeliveryReady ? 'Final delivery' : locked ? 'Selection received' : 'Selection gallery'}
              </Badge>
              <h2 className="font-serif text-3xl font-bold">{copy.title}</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">{copy.description}</p>
            </div>

            <div className="grid gap-3 text-sm sm:grid-cols-3 lg:w-[440px]">
              {['Selection', 'Editing', 'Delivery'].map((label, index) => {
                const active = step >= index + 1
                return (
                  <div key={label} className={`rounded-2xl border p-4 ${active ? 'border-primary/40 bg-primary/10' : 'bg-background'}`}>
                    <div className="flex items-center gap-2 font-medium">
                      {active ? <CheckCircle className="h-4 w-4 text-primary" /> : <span className="h-4 w-4 rounded-full border" />}
                      {label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {finalDeliveryReady ? (
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Final Edited Photos</h2>
              <p className="text-muted-foreground">
                {finalPhotos.length} final photo{finalPhotos.length === 1 ? '' : 's'} ready for download.
              </p>
            </div>
            <Button
              onClick={() => {
                downloadAll(finalPhotos)
                toast.success('Starting final photo downloads')
              }}
              disabled={finalPhotos.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Download All
            </Button>
          </div>
        ) : (
          <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Proof Photos</h2>
              <p className="text-muted-foreground">
                {proofPhotos.length} proof photo{proofPhotos.length === 1 ? '' : 's'} available • {selectedCount} selected
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                Downloads are disabled until final edited photos are delivered.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="w-fit">
                {locked ? 'Selection locked' : 'Selection open'}
              </Badge>
              <Button onClick={submitSelection} disabled={locked || selectedCount === 0 || isSubmittingSelection}>
                {isSubmittingSelection ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                {locked ? 'Selection Submitted' : `Submit Selection (${selectedCount})`}
              </Button>
            </div>
          </div>
        )}

        {visiblePhotos.length === 0 ? (
          <div className="rounded-2xl border py-20 text-center">
            <ImageIcon className="mx-auto mb-4 h-14 w-14 text-muted-foreground/40" />
            <h3 className="text-xl font-semibold">
              {finalDeliveryReady ? 'No final photos available yet' : 'No proof photos available yet'}
            </h3>
            <p className="mt-2 text-muted-foreground">
              {finalDeliveryReady
                ? 'The studio has not uploaded downloadable final photos yet.'
                : 'The studio has not uploaded photos to this gallery yet.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visiblePhotos.map((photo, index) => {
              const isUpdating = updatingPhotoId === photo.id
              const isFinal = getStage(photo) === 'edited'
              const downloadable = isFinal && finalDeliveryReady && photo.download_enabled !== false

              return (
                <div
                  key={photo.id}
                  className="group overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPhotoId(photo.id)}
                    className="block w-full text-left"
                  >
                    <div className="relative aspect-[4/3] bg-muted">
                      <Image
                        src={photo.thumbnail_url || photo.image_url}
                        alt={getPhotoTitle(photo, index)}
                        fill
                        sizes="(max-width: 768px) 100vw, 25vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
                      <Badge className="absolute left-3 top-3" variant={isFinal ? 'default' : 'secondary'}>
                        {isFinal ? (
                          <>
                            <Sparkles className="mr-1 h-3 w-3" /> Final
                          </>
                        ) : (
                          'Proof'
                        )}
                      </Badge>
                      {photo.is_selected && !isFinal && (
                        <Badge className="absolute bottom-3 left-3">
                          <Heart className="mr-1 h-3 w-3 fill-current" />
                          Selected
                        </Badge>
                      )}
                    </div>
                    <div className="p-3 pb-2">
                      <p className="truncate font-medium">{getPhotoTitle(photo, index)}</p>
                      <p className="text-xs text-muted-foreground">
                        {downloadable ? 'Download ready' : isFinal ? 'Final edited file' : 'Click photo to preview'}
                      </p>
                    </div>
                  </button>

                  <div className="px-3 pb-3">
                    {isFinal ? (
                      downloadable ? (
                        <Button asChild className="w-full">
                          <a href={photo.image_url} target="_blank" rel="noreferrer" download={photo.title || 'edited-photo.jpg'}>
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      ) : (
                        <Button className="w-full" disabled>
                          <Lock className="mr-2 h-4 w-4" />
                          Download Locked
                        </Button>
                      )
                    ) : (
                      <Button
                        type="button"
                        variant={photo.is_selected ? 'default' : 'outline'}
                        className="w-full"
                        onClick={() => togglePhotoSelection(photo)}
                        disabled={isUpdating || locked}
                      >
                        {isUpdating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : locked ? (
                          <Lock className="mr-2 h-4 w-4" />
                        ) : (
                          <Heart className={`mr-2 h-4 w-4 ${photo.is_selected ? 'fill-current' : ''}`} />
                        )}
                        {locked ? (photo.is_selected ? 'Selected' : 'Not Selected') : photo.is_selected ? 'Selected' : 'Select Photo'}
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={!!selectedPhoto} onOpenChange={(open) => !open && setSelectedPhotoId(null)}>
        <DialogContent className="max-h-[95vh] max-w-[95vw] border-none bg-black/95 p-0">
          <button
            type="button"
            onClick={() => setSelectedPhotoId(null)}
            className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2 transition hover:bg-white/20"
          >
            <X className="h-6 w-6 text-white" />
          </button>

          {selectedIndex > 0 && (
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-white/10 p-2 transition hover:bg-white/20"
            >
              <ChevronLeft className="h-8 w-8 text-white" />
            </button>
          )}

          {selectedIndex >= 0 && selectedIndex < visiblePhotos.length - 1 && (
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-4 top-1/2 z-50 -translate-y-1/2 rounded-full bg-white/10 p-2 transition hover:bg-white/20"
            >
              <ChevronRight className="h-8 w-8 text-white" />
            </button>
          )}

          {selectedPhoto && (
            <div className="relative flex h-[90vh] w-full items-center justify-center">
              <Image
                src={selectedPhoto.image_url}
                alt={selectedPhoto.title || 'Gallery photo'}
                fill
                sizes="95vw"
                className="object-contain"
                priority
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedPhoto.title || 'Gallery photo'}</h3>
                    <p className="text-sm text-white/70">
                      Photo {selectedIndex + 1} of {visiblePhotos.length} • {getStage(selectedPhoto) === 'edited' ? 'Final edited photo' : 'Proof selection only'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getStage(selectedPhoto) === 'edited' && finalDeliveryReady && selectedPhoto.download_enabled !== false ? (
                      <Button asChild variant="secondary">
                        <a href={selectedPhoto.image_url} target="_blank" rel="noreferrer" download={selectedPhoto.title || 'edited-photo.jpg'}>
                          <Download className="mr-2 h-4 w-4" />
                          Download Final
                        </a>
                      </Button>
                    ) : getStage(selectedPhoto) === 'edited' ? (
                      <Button type="button" variant="secondary" disabled>
                        <Lock className="mr-2 h-4 w-4" />
                        Download Locked
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant={selectedPhoto.is_selected ? 'default' : 'secondary'}
                        onClick={() => togglePhotoSelection(selectedPhoto)}
                        disabled={updatingPhotoId === selectedPhoto.id || locked}
                      >
                        {updatingPhotoId === selectedPhoto.id ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : locked ? (
                          <Lock className="mr-2 h-4 w-4" />
                        ) : (
                          <Heart className={`mr-2 h-4 w-4 ${selectedPhoto.is_selected ? 'fill-current' : ''}`} />
                        )}
                        {locked ? 'Selection Locked' : selectedPhoto.is_selected ? 'Selected' : 'Select'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
