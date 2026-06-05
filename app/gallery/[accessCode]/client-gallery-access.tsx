'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Heart, ImageIcon, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'

type GalleryPhotoRecord = {
  id: string
  gallery_id: string | null
  image_url: string
  thumbnail_url: string | null
  title: string | null
  is_selected: boolean | null
  created_at: string
}

type GalleryRecord = {
  id: string
  title: string
  access_code: string | null
  expires_at: string | null
  is_active: boolean | null
}

type ClientGalleryAccessProps = {
  gallery: GalleryRecord
  photos: GalleryPhotoRecord[]
}

function getPhotoTitle(photo: GalleryPhotoRecord, index: number) {
  return photo.title || `Photo ${index + 1}`
}

export function ClientGalleryAccess({ gallery, photos }: ClientGalleryAccessProps) {
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)

  const sortedPhotos = useMemo(
    () => [...photos].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [photos]
  )

  const selectedIndex = selectedPhotoId ? sortedPhotos.findIndex((photo) => photo.id === selectedPhotoId) : -1
  const selectedPhoto = selectedIndex >= 0 ? sortedPhotos[selectedIndex] : null
  const selectedCount = sortedPhotos.filter((photo) => photo.is_selected).length

  const goToPrevious = () => {
    if (selectedIndex > 0) setSelectedPhotoId(sortedPhotos[selectedIndex - 1].id)
  }

  const goToNext = () => {
    if (selectedIndex >= 0 && selectedIndex < sortedPhotos.length - 1) {
      setSelectedPhotoId(sortedPhotos[selectedIndex + 1].id)
    }
  }

  return (
    <section className="px-4 py-12">
      <div className="container mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Gallery Photos</h2>
            <p className="text-muted-foreground">
              {sortedPhotos.length} photo{sortedPhotos.length === 1 ? '' : 's'} available
              {selectedCount > 0 ? ` • ${selectedCount} selected by the studio/client` : ''}
            </p>
          </div>
          <Badge variant="secondary" className="w-fit">
            {gallery.is_active ? 'Published' : 'Draft'}
          </Badge>
        </div>

        {sortedPhotos.length === 0 ? (
          <div className="rounded-2xl border py-20 text-center">
            <ImageIcon className="mx-auto mb-4 h-14 w-14 text-muted-foreground/40" />
            <h3 className="text-xl font-semibold">No photos available yet</h3>
            <p className="mt-2 text-muted-foreground">The studio has not uploaded photos to this gallery yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {sortedPhotos.map((photo, index) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setSelectedPhotoId(photo.id)}
                className="group overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
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
                  {photo.is_selected && (
                    <Badge className="absolute bottom-3 left-3">
                      <Heart className="mr-1 h-3 w-3 fill-current" />
                      Selected
                    </Badge>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate font-medium">{getPhotoTitle(photo, index)}</p>
                  <p className="text-xs text-muted-foreground">Click to preview</p>
                </div>
              </button>
            ))}
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

          {selectedIndex >= 0 && selectedIndex < sortedPhotos.length - 1 && (
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
                    <p className="text-sm text-white/70">Photo {selectedIndex + 1} of {sortedPhotos.length}</p>
                  </div>
                  <Button asChild variant="secondary">
                    <a href={selectedPhoto.image_url} target="_blank" rel="noreferrer" download>
                      <Download className="mr-2 h-4 w-4" />
                      Open Original
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
