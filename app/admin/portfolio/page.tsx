'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Edit, Eye, LinkIcon, Plus, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  formatFileSize,
  GALLERY_IMAGES_BUCKET,
  isAllowedGalleryImage,
  isGalleryImageTooLarge,
  MAX_PORTFOLIO_UPLOAD_FILES,
} from '@/lib/storage'

type GalleryItem = {
  id: string
  title: string
  description: string | null
  session_type: string | null
  image_url: string
  is_featured: boolean | null
  is_public: boolean | null
  display_order: number | null
  created_at: string | null
}

type GalleryForm = {
  id?: string
  title: string
  description: string
  session_type: string
  image_url: string
  is_featured: boolean
  is_public: boolean
  display_order: string
}

type SelectedPortfolioImage = {
  file: File
  previewUrl: string
}

type UploadSlot = {
  name: string
  path: string
  token: string
  url: string
}

const emptyForm: GalleryForm = {
  title: '',
  description: '',
  session_type: 'portrait',
  image_url: '',
  is_featured: false,
  is_public: true,
  display_order: '0',
}

const sessionTypes = [
  { value: 'wedding', label: 'Wedding' },
  { value: 'portrait', label: 'Portrait' },
  { value: 'event', label: 'Event' },
  { value: 'corporate', label: 'Corporate' },
  { value: 'product', label: 'Product' },
  { value: 'family', label: 'Family' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'newborn', label: 'Newborn' },
]

async function readApiResponse(response: Response) {
  const text = await response.text()
  if (!text) return {}

  try {
    return JSON.parse(text)
  } catch {
    return {
      error: response.ok
        ? 'The server returned an invalid response.'
        : text.slice(0, 180) || `Request failed (${response.status}).`,
    }
  }
}

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<GalleryForm>(emptyForm)
  const [imageSource, setImageSource] = useState<'upload' | 'url'>('upload')
  const [selectedImages, setSelectedImages] = useState<SelectedPortfolioImage[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/portfolio-gallery', { cache: 'no-store' })
      const result = await readApiResponse(response)
      if (!response.ok) throw new Error(result.error || 'Failed to load portfolio')
      setItems(result.data || [])
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to load portfolio')
    } finally {
      setLoading(false)
    }
  }

  function openCreateDialog() {
    clearSelectedImages()
    setForm(emptyForm)
    setImageSource('upload')
    setUploadProgress(0)
    setDialogOpen(true)
  }

  function openEditDialog(item: GalleryItem) {
    clearSelectedImages()
    setForm({
      id: item.id,
      title: item.title || '',
      description: item.description || '',
      session_type: item.session_type || 'portrait',
      image_url: item.image_url || '',
      is_featured: Boolean(item.is_featured),
      is_public: item.is_public !== false,
      display_order: String(item.display_order || 0),
    })
    setImageSource('upload')
    setUploadProgress(0)
    setDialogOpen(true)
  }

  function clearSelectedImages() {
    setSelectedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
      return []
    })
  }

  function handleDialogOpenChange(open: boolean) {
    setDialogOpen(open)
    if (!open) {
      clearSelectedImages()
      setUploadProgress(0)
    }
  }

  function handleFileSelection(files: FileList | null) {
    const requestedFiles = Array.from(files || [])
    if (requestedFiles.length === 0) return

    const maxFiles = form.id ? 1 : MAX_PORTFOLIO_UPLOAD_FILES
    const validFiles: File[] = []

    for (const file of requestedFiles) {
      if (!isAllowedGalleryImage(file)) {
        toast.error(`${file.name} is not a supported image type`)
        continue
      }
      if (isGalleryImageTooLarge(file)) {
        toast.error(`${file.name} is too large. Maximum size is 35 MB`)
        continue
      }
      validFiles.push(file)
    }

    if (validFiles.length > maxFiles) {
      toast.error(
        form.id
          ? 'Choose one replacement image when editing.'
          : `Choose up to ${MAX_PORTFOLIO_UPLOAD_FILES} images at once.`,
      )
    }

    const acceptedFiles = validFiles.slice(0, maxFiles)
    setSelectedImages((current) => {
      current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
      return acceptedFiles.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }))
    })
    setUploadProgress(0)
  }

  function removeSelectedImage(index: number) {
    setSelectedImages((current) => {
      const removed = current[index]
      if (removed) URL.revokeObjectURL(removed.previewUrl)
      return current.filter((_, itemIndex) => itemIndex !== index)
    })
  }

  async function cleanupUploadedFiles(paths: string[]) {
    if (paths.length === 0) return

    try {
      await fetch('/api/admin/portfolio-gallery/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths }),
      })
    } catch (error) {
      console.warn('Unable to clean up incomplete portfolio uploads:', error)
    }
  }

  async function uploadSelectedImages() {
    setUploading(true)
    setUploadProgress(0)

    const response = await fetch('/api/admin/portfolio-gallery/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        files: selectedImages.map(({ file }) => ({
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      }),
    })
    const result = await readApiResponse(response)

    if (!response.ok) throw new Error(result.error || 'Failed to prepare image upload')

    const uploads = Array.isArray(result.uploads) ? result.uploads as UploadSlot[] : []
    if (uploads.length !== selectedImages.length) {
      throw new Error('The server did not prepare every selected image for upload.')
    }

    const supabase = createClient()
    const completed: UploadSlot[] = []

    try {
      for (let index = 0; index < uploads.length; index += 1) {
        const upload = uploads[index]
        const file = selectedImages[index].file
        const { error } = await supabase.storage
          .from(GALLERY_IMAGES_BUCKET)
          .uploadToSignedUrl(upload.path, upload.token, file, {
            cacheControl: '31536000',
            contentType: file.type,
          })

        if (error) throw new Error(`${file.name}: ${error.message}`)

        completed.push(upload)
        setUploadProgress(index + 1)
      }
    } catch (error) {
      await cleanupUploadedFiles(completed.map((upload) => upload.path))
      throw error
    }

    return completed
  }

  async function saveItem() {
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }
    if (imageSource === 'url' && !form.image_url.trim()) {
      toast.error('Image URL is required')
      return
    }
    if (imageSource === 'upload' && selectedImages.length === 0 && !form.image_url.trim()) {
      toast.error('Choose at least one image')
      return
    }

    setSaving(true)
    let newUploads: UploadSlot[] = []

    try {
      const isEdit = Boolean(form.id)
      let imageUrls = [form.image_url.trim()].filter(Boolean)

      if (imageSource === 'upload' && selectedImages.length > 0) {
        newUploads = await uploadSelectedImages()
        imageUrls = newUploads.map((upload) => upload.url)
      }

      const response = await fetch(
        isEdit ? `/api/admin/portfolio-gallery/${form.id}` : '/api/admin/portfolio-gallery',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description || null,
            session_type: form.session_type,
            ...(isEdit ? { image_url: imageUrls[0] } : { image_urls: imageUrls }),
            is_featured: form.is_featured,
            is_public: form.is_public,
            display_order: Number(form.display_order || 0),
          }),
        },
      )

      const result = await readApiResponse(response)
      if (!response.ok) throw new Error(result.error || 'Failed to save portfolio item')

      newUploads = []
      const savedCount = isEdit ? 1 : imageUrls.length
      toast.success(isEdit ? 'Portfolio item updated' : `${savedCount} portfolio ${savedCount === 1 ? 'image' : 'images'} added`)
      handleDialogOpenChange(false)
      await fetchItems()
    } catch (error) {
      await cleanupUploadedFiles(newUploads.map((upload) => upload.path))
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to save portfolio item')
    } finally {
      setSaving(false)
      setUploading(false)
    }
  }

  async function toggleVisibility(item: GalleryItem) {
    try {
      const response = await fetch(`/api/admin/portfolio-gallery/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !item.is_public }),
      })
      const result = await readApiResponse(response)
      if (!response.ok) throw new Error(result.error || 'Failed to update visibility')
      toast.success(!item.is_public ? 'Portfolio item published' : 'Portfolio item hidden')
      await fetchItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update visibility')
    }
  }

  async function deleteItem(item: GalleryItem) {
    if (!confirm(`Delete "${item.title}" from the public portfolio?`)) return

    try {
      const response = await fetch(`/api/admin/portfolio-gallery/${item.id}`, {
        method: 'DELETE',
      })
      const result = await readApiResponse(response)
      if (!response.ok) throw new Error(result.error || 'Failed to delete portfolio item')
      toast.success('Portfolio item deleted')
      await fetchItems()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete portfolio item')
    }
  }

  const filteredItems = useMemo(() => {
    const query = search.toLowerCase()
    return items.filter((item) =>
      item.title.toLowerCase().includes(query) ||
      String(item.session_type || '').toLowerCase().includes(query) ||
      String(item.description || '').toLowerCase().includes(query),
    )
  }, [items, search])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Portfolio Gallery</h1>
          <p className="text-muted-foreground">Manage public portfolio images shown on the website.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchItems} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Portfolio Image
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search portfolio..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredItems.map((item) => (
          <Card key={item.id} className="overflow-hidden">
            <div className="relative aspect-video bg-muted">
              <Image
                src={item.image_url}
                alt={item.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            </div>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="font-serif text-xl">{item.title}</CardTitle>
                  <CardDescription className="capitalize">{item.session_type || 'Portfolio'}</CardDescription>
                </div>
                <Badge variant="outline">{item.is_public ? 'Public' : 'Hidden'}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="line-clamp-2 text-sm text-muted-foreground">{item.description || 'No description'}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => toggleVisibility(item)}>
                  <Eye className="mr-2 h-4 w-4" />
                  {item.is_public ? 'Hide' : 'Publish'}
                </Button>
                <Button variant="destructive" size="sm" onClick={() => deleteItem(item)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {!loading && filteredItems.length === 0 && (
          <Card className="md:col-span-2 xl:col-span-3">
            <CardContent className="py-16 text-center text-muted-foreground">
              No portfolio images found.
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Portfolio Image' : 'Add Portfolio Image'}</DialogTitle>
            <DialogDescription>
              Upload images directly to Supabase Storage or use one external image URL.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Session Type</Label>
                <Select value={form.session_type} onValueChange={(value) => setForm({ ...form, session_type: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {sessionTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Display Order</Label>
                <Input type="number" value={form.display_order} onChange={(event) => setForm({ ...form, display_order: event.target.value })} />
              </div>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <Label>Image Source</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  type="button"
                  variant={imageSource === 'upload' ? 'default' : 'outline'}
                  onClick={() => setImageSource('upload')}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </Button>
                <Button
                  type="button"
                  variant={imageSource === 'url' ? 'default' : 'outline'}
                  onClick={() => {
                    clearSelectedImages()
                    setImageSource('url')
                  }}
                >
                  <LinkIcon className="mr-2 h-4 w-4" />
                  Use Image URL
                </Button>
              </div>

              {imageSource === 'upload' ? (
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple={!form.id}
                    disabled={saving}
                    onChange={(event) => handleFileSelection(event.target.files)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {form.id
                      ? 'Choose one replacement image. Maximum file size: 35 MB.'
                      : `Choose up to ${MAX_PORTFOLIO_UPLOAD_FILES} images for the selected session type. Maximum file size: 35 MB each.`}
                  </p>
                  {uploading && (
                    <p className="text-sm text-primary">
                      Uploading image {Math.min(uploadProgress + 1, selectedImages.length)} of {selectedImages.length}...
                    </p>
                  )}

                  {selectedImages.length > 0 && (
                    <div className="space-y-2 rounded-md border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium">
                          {selectedImages.length} {selectedImages.length === 1 ? 'image' : 'images'} ready
                        </p>
                        <Button type="button" variant="ghost" size="sm" onClick={clearSelectedImages} disabled={saving}>
                          Clear
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {selectedImages.map((image, index) => (
                          <div key={`${image.file.name}-${image.file.lastModified}`} className="flex items-center gap-3 rounded-md bg-muted/50 p-2">
                            <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded bg-muted">
                              <Image src={image.previewUrl} alt={image.file.name} fill unoptimized className="object-cover" sizes="64px" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{image.file.name}</p>
                              <p className="text-xs text-muted-foreground">{formatFileSize(image.file.size)}</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Remove ${image.file.name}`}
                              onClick={() => removeSelectedImage(index)}
                              disabled={saving}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    value={form.image_url}
                    onChange={(event) => setForm({ ...form, image_url: event.target.value })}
                    placeholder="https://..."
                  />
                </div>
              )}
            </div>

            {selectedImages.length > 0 ? (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {selectedImages.map((image) => (
                    <div key={`preview-${image.file.name}-${image.file.lastModified}`} className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                      <Image src={image.previewUrl} alt={image.file.name} fill unoptimized className="object-cover" sizes="(max-width: 640px) 50vw, 220px" />
                    </div>
                  ))}
                </div>
              </div>
            ) : form.image_url && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                  <Image src={form.image_url} alt="Preview" fill className="object-cover" sizes="(max-width: 768px) 100vw, 640px" />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Visible on public website</p>
                <p className="text-sm text-muted-foreground">Turn off to hide this image without deleting it.</p>
              </div>
              <Switch checked={form.is_public} onCheckedChange={(checked) => setForm({ ...form, is_public: checked })} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Featured</p>
                <p className="text-sm text-muted-foreground">Mark as a featured portfolio image.</p>
              </div>
              <Switch checked={form.is_featured} onCheckedChange={(checked) => setForm({ ...form, is_featured: checked })} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveItem} disabled={saving || uploading}>
              {saving
                ? uploading
                  ? `Uploading ${Math.min(uploadProgress + 1, selectedImages.length)} of ${selectedImages.length}...`
                  : 'Saving...'
                : !form.id && selectedImages.length > 1
                  ? `Save ${selectedImages.length} Portfolio Images`
                  : 'Save Portfolio Image'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
