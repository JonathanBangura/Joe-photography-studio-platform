'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { Check, Copy, Download, ExternalLink, Heart, ImagePlus, Loader2, Trash2, Upload, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { createAuditLog } from '@/lib/audit-log-client'
import {
  buildGalleryStoragePath,
  formatFileSize,
  GALLERY_IMAGES_BUCKET,
  getStoragePathFromPublicUrl,
  isAllowedGalleryImage,
  isGalleryImageTooLarge,
} from '@/lib/storage'
import { toast } from 'sonner'

type ClientRecord = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  profile?: {
    full_name: string | null
    email: string | null
    phone?: string | null
  } | null
}

type ServiceRecord = {
  id: string
  name: string
  session_type?: string | null
}

type StaffRecord = {
  id: string
  full_name: string | null
  email: string | null
}

type BookingRecord = {
  id: string
  booking_reference: string | null
  booking_date: string
  start_time: string
  end_time: string
  status: string | null
  service?: ServiceRecord | null
  staff?: StaffRecord | null
}

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
  client_id: string | null
  booking_id: string | null
  title: string
  access_code: string | null
  expires_at: string | null
  is_active: boolean | null
  created_at: string
  client?: ClientRecord | null
  booking?: BookingRecord | null
  photos?: GalleryPhotoRecord[] | null
}

interface GalleryDetailClientProps {
  initialGallery: GalleryRecord
}

function getClientName(client?: ClientRecord | null) {
  return client?.full_name || client?.profile?.full_name || client?.email || client?.profile?.email || 'Unknown Client'
}

function getClientEmail(client?: ClientRecord | null) {
  return client?.email || client?.profile?.email || 'No email'
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString()
}

export function GalleryDetailClient({ initialGallery }: GalleryDetailClientProps) {
  const [gallery, setGallery] = useState<GalleryRecord>(initialGallery)
  const [photos, setPhotos] = useState<GalleryPhotoRecord[]>(initialGallery.photos || [])
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState<GalleryPhotoRecord | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const selectedCount = useMemo(() => photos.filter((photo) => photo.is_selected).length, [photos])
  const galleryLink = typeof window !== 'undefined' && gallery.access_code ? `${window.location.origin}/gallery/${gallery.access_code}` : ''

  const refreshPhotos = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('client_gallery_photos')
      .select('*')
      .eq('gallery_id', gallery.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      toast.error('Failed to refresh photos')
      return
    }

    setPhotos((data || []) as GalleryPhotoRecord[])
  }

  const copyGalleryLink = async () => {
    if (!galleryLink) return
    await navigator.clipboard.writeText(galleryLink)
    toast.success('Gallery link copied')
  }

  const handleFileSelection = (files: FileList | null) => {
    const nextFiles = Array.from(files || [])
    if (nextFiles.length === 0) return

    const validFiles: File[] = []

    for (const file of nextFiles) {
      if (!isAllowedGalleryImage(file)) {
        toast.error(`${file.name} is not a supported image type`)
        continue
      }
      if (isGalleryImageTooLarge(file)) {
        toast.error(`${file.name} is too large. Maximum size is 10 MB`)
        continue
      }
      validFiles.push(file)
    }

    setSelectedFiles(validFiles)
  }

  const uploadPhotos = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Choose photos first')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    const supabase = createClient()
    const uploadedPhotos: GalleryPhotoRecord[] = []

    try {
      for (let index = 0; index < selectedFiles.length; index++) {
        const file = selectedFiles[index]
        const storagePath = buildGalleryStoragePath(gallery.id, file.name)

        const { error: uploadError } = await supabase.storage
          .from(GALLERY_IMAGES_BUCKET)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
          })

        if (uploadError) {
          throw new Error(`${file.name}: ${uploadError.message}`)
        }

        const { data: publicUrlData } = supabase.storage
          .from(GALLERY_IMAGES_BUCKET)
          .getPublicUrl(storagePath)

        const { data: photo, error: insertError } = await supabase
          .from('client_gallery_photos')
          .insert({
            gallery_id: gallery.id,
            image_url: publicUrlData.publicUrl,
            thumbnail_url: publicUrlData.publicUrl,
            title: file.name,
            is_selected: false,
          })
          .select('*')
          .single()

        if (insertError) {
          await supabase.storage.from(GALLERY_IMAGES_BUCKET).remove([storagePath])
          throw new Error(`${file.name}: ${insertError.message}`)
        }

        uploadedPhotos.push(photo as GalleryPhotoRecord)
        setUploadProgress(Math.round(((index + 1) / selectedFiles.length) * 100))
      }

      await createAuditLog({
        action: 'upload_gallery_photos',
        resource_type: 'client_gallery',
        resource_id: gallery.id,
        new_data: { gallery_id: gallery.id, count: uploadedPhotos.length },
      })

      setPhotos([...uploadedPhotos, ...photos])
      setSelectedFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
      toast.success(`${uploadedPhotos.length} photo${uploadedPhotos.length === 1 ? '' : 's'} uploaded`)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload photos')
      await refreshPhotos()
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const togglePublish = async () => {
    const supabase = createClient()
    const nextStatus = !gallery.is_active

    const { data, error } = await supabase
      .from('client_galleries')
      .update({ is_active: nextStatus })
      .eq('id', gallery.id)
      .select('*, client:clients(*, profile:profiles(*)), booking:bookings(*, service:services(*), staff:profiles(*)), photos:client_gallery_photos(*)')
      .single()

    if (error) {
      console.error(error)
      toast.error('Failed to update gallery status')
      return
    }

    await createAuditLog({
      action: nextStatus ? 'publish_gallery' : 'unpublish_gallery',
      resource_type: 'client_gallery',
      resource_id: gallery.id,
      old_data: gallery,
      new_data: data,
    })

    setGallery(data as GalleryRecord)
    setPhotos((data?.photos || []) as GalleryPhotoRecord[])
    toast.success(nextStatus ? 'Gallery published' : 'Gallery moved to draft')
  }

  const togglePhotoSelection = async (photo: GalleryPhotoRecord) => {
    const supabase = createClient()
    const nextValue = !photo.is_selected

    const { data, error } = await supabase
      .from('client_gallery_photos')
      .update({ is_selected: nextValue })
      .eq('id', photo.id)
      .select('*')
      .single()

    if (error) {
      console.error(error)
      toast.error('Failed to update photo selection')
      return
    }

    setPhotos(photos.map((item) => (item.id === photo.id ? (data as GalleryPhotoRecord) : item)))
  }

  const deletePhoto = async () => {
    if (!deleteTarget) return

    setIsDeleting(true)
    const supabase = createClient()
    const storagePath = getStoragePathFromPublicUrl(deleteTarget.image_url)

    const { error: dbError } = await supabase
      .from('client_gallery_photos')
      .delete()
      .eq('id', deleteTarget.id)

    if (dbError) {
      console.error(dbError)
      toast.error('Failed to delete photo record')
      setIsDeleting(false)
      return
    }

    if (storagePath) {
      const { error: storageError } = await supabase.storage.from(GALLERY_IMAGES_BUCKET).remove([storagePath])
      if (storageError) console.warn('Storage delete warning:', storageError.message)
    }

    await createAuditLog({
      action: 'delete_gallery_photo',
      resource_type: 'client_gallery_photo',
      resource_id: deleteTarget.id,
      old_data: deleteTarget,
    })

    setPhotos(photos.filter((photo) => photo.id !== deleteTarget.id))
    setDeleteTarget(null)
    setIsDeleting(false)
    toast.success('Photo deleted')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{gallery.title}</h1>
            <Badge variant={gallery.is_active ? 'default' : 'secondary'}>{gallery.is_active ? 'Published' : 'Draft'}</Badge>
          </div>
          <p className="text-muted-foreground">Upload photos, manage delivery access, and monitor client selections.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={copyGalleryLink} disabled={!gallery.access_code}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
          {gallery.access_code && (
            <Button asChild variant="outline">
              <Link href={`/gallery/${gallery.access_code}`} target="_blank">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Client View
              </Link>
            </Button>
          )}
          <Button onClick={togglePublish} variant={gallery.is_active ? 'secondary' : 'default'}>
            {gallery.is_active ? <X className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
            {gallery.is_active ? 'Unpublish' : 'Publish'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Photos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{photos.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Selected</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{selectedCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Access Code</CardTitle></CardHeader><CardContent><div className="font-mono text-lg font-semibold">{gallery.access_code || 'N/A'}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Expires</CardTitle></CardHeader><CardContent><div className="text-lg font-semibold">{formatDate(gallery.expires_at)}</div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Upload Photos</CardTitle>
              <CardDescription>Upload JPG, PNG, WEBP, or GIF images. Maximum file size is 10 MB per photo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg border border-dashed p-6 text-center">
                <ImagePlus className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                <Label htmlFor="photo-upload" className="cursor-pointer font-medium">Choose gallery photos</Label>
                <p className="mt-1 text-sm text-muted-foreground">You can select multiple files at once.</p>
                <Input
                  ref={fileInputRef}
                  id="photo-upload"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  className="mt-4"
                  onChange={(event) => handleFileSelection(event.target.files)}
                />
              </div>

              {selectedFiles.length > 0 && (
                <div className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-medium">Ready to upload</h3>
                    <span className="text-sm text-muted-foreground">{selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'}</span>
                  </div>
                  <div className="max-h-40 space-y-2 overflow-y-auto text-sm">
                    {selectedFiles.map((file) => (
                      <div key={`${file.name}-${file.size}`} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                        <span className="truncate">{file.name}</span>
                        <span className="ml-3 shrink-0 text-muted-foreground">{formatFileSize(file.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} />
                  <p className="text-sm text-muted-foreground">Uploading photos... {uploadProgress}%</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setSelectedFiles([]); if (fileInputRef.current) fileInputRef.current.value = '' }} disabled={isUploading || selectedFiles.length === 0}>Clear</Button>
                <Button onClick={uploadPhotos} disabled={isUploading || selectedFiles.length === 0}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Upload Photos
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Photos</CardTitle>
              <CardDescription>{photos.length} photo{photos.length === 1 ? '' : 's'} in this gallery. Selected photos are marked with a heart.</CardDescription>
            </CardHeader>
            <CardContent>
              {photos.length === 0 ? (
                <div className="py-16 text-center">
                  <ImagePlus className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
                  <h3 className="font-semibold">No photos uploaded yet</h3>
                  <p className="text-sm text-muted-foreground">Upload photos above to start preparing this gallery for the client.</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group overflow-hidden rounded-xl border bg-card">
                      <div className="relative aspect-[4/3] bg-muted">
                        <Image src={photo.image_url} alt={photo.title || 'Gallery photo'} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
                        <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button size="icon" variant={photo.is_selected ? 'default' : 'secondary'} onClick={() => togglePhotoSelection(photo)} title="Toggle selected">
                            <Heart className={photo.is_selected ? 'h-4 w-4 fill-current' : 'h-4 w-4'} />
                          </Button>
                          <div className="flex gap-2">
                            <Button asChild size="icon" variant="secondary" title="Open photo">
                              <a href={photo.image_url} target="_blank" rel="noreferrer"><Download className="h-4 w-4" /></a>
                            </Button>
                            <Button size="icon" variant="destructive" onClick={() => setDeleteTarget(photo)} title="Delete photo">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {photo.is_selected && <Badge className="absolute bottom-3 left-3"><Heart className="mr-1 h-3 w-3 fill-current" />Selected</Badge>}
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-medium">{photo.title || 'Untitled photo'}</p>
                        <p className="text-xs text-muted-foreground">Uploaded {formatDate(photo.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Gallery Details</CardTitle>
              <CardDescription>Client and booking information linked to this gallery.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-muted-foreground">Client</p>
                <p className="font-medium">{getClientName(gallery.client)}</p>
                <p className="text-muted-foreground">{getClientEmail(gallery.client)}</p>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Booking</p>
                <p className="font-medium">{gallery.booking?.booking_reference || gallery.booking_id?.slice(0, 8) || 'N/A'}</p>
                <p className="text-muted-foreground">{gallery.booking?.service?.name || 'Service not set'}</p>
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Shoot Date</p>
                  <p className="font-medium">{formatDate(gallery.booking?.booking_date)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{gallery.booking?.status || 'N/A'}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-muted-foreground">Assigned Photographer</p>
                <p className="font-medium">{gallery.booking?.staff?.full_name || gallery.booking?.staff?.email || 'Not assigned'}</p>
              </div>
              {galleryLink && (
                <>
                  <Separator />
                  <div>
                    <p className="text-muted-foreground">Client Link</p>
                    <button type="button" onClick={copyGalleryLink} className="break-all text-left text-primary hover:underline">{galleryLink}</button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete photo?</DialogTitle>
            <DialogDescription>This removes the photo record and attempts to delete the uploaded image from Supabase Storage.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Cancel</Button>
            <Button variant="destructive" onClick={deletePhoto} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
