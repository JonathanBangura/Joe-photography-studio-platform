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
import { Edit, Eye, LinkIcon, Plus, RefreshCw, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'

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

export default function AdminPortfolioPage() {
  const [items, setItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState<GalleryForm>(emptyForm)
  const [imageSource, setImageSource] = useState<'upload' | 'url'>('upload')

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/portfolio-gallery', { cache: 'no-store' })
      const result = await response.json()
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
    setForm(emptyForm)
    setImageSource('upload')
    setDialogOpen(true)
  }

  function openEditDialog(item: GalleryItem) {
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
    setImageSource('url')
    setDialogOpen(true)
  }

  async function uploadPortfolioImage(file: File) {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/admin/portfolio-gallery/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to upload image')

      setForm((current) => ({ ...current, image_url: result.url }))
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  async function saveItem() {
    if (!form.title.trim() || !form.image_url.trim()) {
      toast.error('Title and image are required')
      return
    }

    setSaving(true)
    try {
      const isEdit = Boolean(form.id)
      const response = await fetch(
        isEdit ? `/api/admin/portfolio-gallery/${form.id}` : '/api/admin/portfolio-gallery',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: form.title,
            description: form.description || null,
            session_type: form.session_type,
            image_url: form.image_url,
            is_featured: form.is_featured,
            is_public: form.is_public,
            display_order: Number(form.display_order || 0),
          }),
        },
      )

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to save portfolio item')

      toast.success(isEdit ? 'Portfolio item updated' : 'Portfolio item created')
      setDialogOpen(false)
      await fetchItems()
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : 'Failed to save portfolio item')
    } finally {
      setSaving(false)
    }
  }

  async function toggleVisibility(item: GalleryItem) {
    try {
      const response = await fetch(`/api/admin/portfolio-gallery/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: !item.is_public }),
      })
      const result = await response.json()
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
      const result = await response.json()
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Portfolio Image' : 'Add Portfolio Image'}</DialogTitle>
            <DialogDescription>
              Upload a portfolio image to Supabase Storage or use an external image URL.
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
                  onClick={() => setImageSource('url')}
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
                    disabled={uploading}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) uploadPortfolioImage(file)
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Uploads to gallery-images/portfolio/. Max file size: 35MB.
                  </p>
                  {uploading && <p className="text-sm text-primary">Uploading image...</p>}
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

            {form.image_url && (
              <div className="space-y-2">
                <Label>Preview</Label>
                <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
                  <Image src={form.image_url} alt="Preview" fill className="object-cover" />
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
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveItem} disabled={saving || uploading}>{saving ? 'Saving...' : 'Save Portfolio Image'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
