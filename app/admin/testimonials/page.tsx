'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, RefreshCw, Star, CheckCircle, XCircle, Trash2, Eye, MessageSquareQuote, Plus, Upload, X, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { optimizeTestimonialImage } from '@/lib/testimonial-image-compression'
import {
  formatFileSize,
  GALLERY_IMAGES_BUCKET,
  isAllowedGalleryImageType,
  isGalleryImageTooLarge,
} from '@/lib/storage'

type Testimonial = {
  id: string
  client_id: string | null
  client_name: string
  content: string
  rating: number | null
  photo_url: string | null
  session_type: string | null
  is_approved: boolean
  is_featured: boolean
  created_at: string
  client?: {
    full_name?: string | null
    email?: string | null
    phone?: string | null
    profile?: {
      full_name?: string | null
      email?: string | null
    } | null
  } | null
}

type SelectedTestimonialImage = {
  file: File
  previewUrl: string
  originalSize: number
  optimized: boolean
}

type TestimonialUploadSlot = {
  path: string
  token: string
  url: string
}

const statusStyles: Record<string, string> = {
  approved: 'bg-green-500/10 text-green-600 border-green-500/20',
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  featured: 'bg-primary/10 text-primary border-primary/20',
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function renderStars(rating?: number | null) {
  const count = Math.min(Math.max(Number(rating || 5), 1), 5)
  return Array.from({ length: 5 }).map((_, index) => (
    <Star
      key={index}
      className={`h-4 w-4 ${index < count ? 'fill-primary text-primary' : 'text-muted-foreground/30'}`}
    />
  ))
}

export default function AdminTestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [addImage, setAddImage] = useState<SelectedTestimonialImage | null>(null)
  const [editImage, setEditImage] = useState<SelectedTestimonialImage | null>(null)
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false)
  const [optimizingImage, setOptimizingImage] = useState(false)
  const [newTestimonial, setNewTestimonial] = useState({
    client_name: '',
    content: '',
    rating: 5,
    is_approved: true,
    is_featured: false,
  })

  useEffect(() => {
    fetchTestimonials()
  }, [])

  async function fetchTestimonials() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/testimonials', { cache: 'no-store' })
      const result = await response.json().catch(() => ({ error: response.statusText }))

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load testimonials')
      }

      setTestimonials(result.testimonials || [])
    } catch (error) {
      console.error('Testimonials load error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load testimonials')
    } finally {
      setLoading(false)
    }
  }

  function openView(testimonial: Testimonial) {
    setEditImage((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl)
      return null
    })
    setSelectedTestimonial(testimonial)
    setEditContent(testimonial.content)
    setRemoveExistingPhoto(false)
    setViewOpen(true)
  }

  function clearSelectedImage(target: 'add' | 'edit') {
    const setter = target === 'add' ? setAddImage : setEditImage
    setter((current) => {
      if (current) URL.revokeObjectURL(current.previewUrl)
      return null
    })
  }

  function openAddDialog() {
    clearSelectedImage('add')
    setAddOpen(true)
  }

  function handleAddDialogOpenChange(open: boolean) {
    if (!open) clearSelectedImage('add')
    setAddOpen(open)
  }

  function handleViewDialogOpenChange(open: boolean) {
    if (!open) {
      clearSelectedImage('edit')
      setRemoveExistingPhoto(false)
    }
    setViewOpen(open)
  }

  async function chooseTestimonialImage(file: File | undefined, target: 'add' | 'edit') {
    if (!file) return
    if (!isAllowedGalleryImageType(file.type) || file.type === 'image/gif') {
      toast.error('Use a JPEG, PNG, or WebP image')
      return
    }
    if (isGalleryImageTooLarge(file)) {
      toast.error('The image is too large. Maximum size is 35 MB')
      return
    }

    setOptimizingImage(true)
    try {
      const result = await optimizeTestimonialImage(file)
      const selected: SelectedTestimonialImage = {
        file: result.file,
        previewUrl: URL.createObjectURL(result.file),
        originalSize: result.originalSize,
        optimized: result.optimized,
      }
      const setter = target === 'add' ? setAddImage : setEditImage
      setter((current) => {
        if (current) URL.revokeObjectURL(current.previewUrl)
        return selected
      })
      if (target === 'edit') setRemoveExistingPhoto(false)
      if (result.optimized) {
        toast.success(`Image optimized: ${formatFileSize(result.originalSize)} → ${formatFileSize(result.file.size)}`)
      }
    } catch (error) {
      console.error('Testimonial image optimization error:', error)
      toast.error(error instanceof Error ? error.message : 'Unable to optimize this image')
    } finally {
      setOptimizingImage(false)
    }
  }

  async function cleanupTestimonialUpload(path: string | undefined) {
    if (!path) return
    try {
      await fetch('/api/admin/testimonials/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })
    } catch (error) {
      console.warn('Unable to clean up incomplete testimonial upload:', error)
    }
  }

  async function uploadTestimonialImage(file: File): Promise<TestimonialUploadSlot> {
    const response = await fetch('/api/admin/testimonials/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: { name: file.name, size: file.size, type: file.type } }),
    })
    const result = await response.json().catch(() => ({ error: response.statusText }))
    if (!response.ok) throw new Error(result.error || 'Unable to prepare testimonial image upload')

    const upload = result.upload as TestimonialUploadSlot | undefined
    if (!upload?.path || !upload.token || !upload.url) {
      throw new Error('The server did not prepare the testimonial image upload.')
    }

    const supabase = createClient()
    const { error } = await supabase.storage
      .from(GALLERY_IMAGES_BUCKET)
      .uploadToSignedUrl(upload.path, upload.token, file, {
        cacheControl: '31536000',
        contentType: file.type,
      })

    if (error) throw new Error(error.message)
    return upload
  }

  async function updateTestimonial(id: string, payload: Partial<Testimonial>) {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/testimonials/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({ error: response.statusText }))

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update testimonial')
      }

      setTestimonials((current) =>
        current.map((item) => (item.id === id ? { ...item, ...result.testimonial } : item)),
      )

      if (selectedTestimonial?.id === id) {
        setSelectedTestimonial((current) => current ? { ...current, ...result.testimonial } : current)
      }

      toast.success('Testimonial updated')
      return result.testimonial as Testimonial
    } catch (error) {
      console.error('Update testimonial error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to update testimonial')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function deleteTestimonial(id: string) {
    if (!confirm('Delete this testimonial permanently?')) return

    setSaving(true)
    try {
      const response = await fetch(`/api/admin/testimonials/${id}`, {
        method: 'DELETE',
      })
      const result = await response.json().catch(() => ({ error: response.statusText }))

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete testimonial')
      }

      setTestimonials((current) => current.filter((item) => item.id !== id))
      setViewOpen(false)
      toast.success('Testimonial deleted')
    } catch (error) {
      console.error('Delete testimonial error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete testimonial')
    } finally {
      setSaving(false)
    }
  }

  async function createTestimonial() {
    if (!newTestimonial.client_name.trim() || !newTestimonial.content.trim()) {
      toast.error('Client name and testimonial content are required')
      return
    }
    if (optimizingImage) {
      toast.error('Please wait for image optimization to finish')
      return
    }

    setSaving(true)
    let upload: TestimonialUploadSlot | null = null
    try {
      if (addImage) upload = await uploadTestimonialImage(addImage.file)

      const response = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTestimonial, photo_url: upload?.url || null }),
      })
      const result = await response.json().catch(() => ({ error: response.statusText }))

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create testimonial')
      }

      setTestimonials((current) => [result.testimonial, ...current])
      setNewTestimonial({
        client_name: '',
        content: '',
        rating: 5,
        is_approved: true,
        is_featured: false,
      })
      clearSelectedImage('add')
      setAddOpen(false)
      toast.success('Testimonial added')
    } catch (error) {
      await cleanupTestimonialUpload(upload?.path)
      console.error('Create testimonial error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create testimonial')
    } finally {
      setSaving(false)
    }
  }

  async function saveTestimonialDetails() {
    if (!selectedTestimonial) return
    if (optimizingImage) {
      toast.error('Please wait for image optimization to finish')
      return
    }

    setSaving(true)
    let upload: TestimonialUploadSlot | null = null
    try {
      if (editImage) upload = await uploadTestimonialImage(editImage.file)

      const updated = await updateTestimonial(selectedTestimonial.id, {
        content: editContent,
        photo_url: upload?.url || (removeExistingPhoto ? null : selectedTestimonial.photo_url),
      })

      if (!updated) {
        await cleanupTestimonialUpload(upload?.path)
        return
      }

      clearSelectedImage('edit')
      setRemoveExistingPhoto(false)
    } catch (error) {
      await cleanupTestimonialUpload(upload?.path)
      console.error('Save testimonial details error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save testimonial details')
    } finally {
      setSaving(false)
    }
  }

  async function seedStarterTestimonials() {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed_starter: true }),
      })
      const result = await response.json().catch(() => ({ error: response.statusText }))

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load starter testimonials')
      }

      setTestimonials((current) => [...(result.testimonials || []), ...current])
      toast.success('Starter testimonials added')
    } catch (error) {
      console.error('Seed starter testimonials error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to add starter testimonials')
    } finally {
      setSaving(false)
    }
  }

  const filteredTestimonials = testimonials.filter((testimonial) => {
    const searchText = `${testimonial.client_name} ${testimonial.content} ${testimonial.session_type || ''}`.toLowerCase()
    const matchesSearch = searchText.includes(searchQuery.toLowerCase())
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending' && !testimonial.is_approved) ||
      (statusFilter === 'approved' && testimonial.is_approved) ||
      (statusFilter === 'featured' && testimonial.is_featured)
    return matchesSearch && matchesStatus
  })

  const stats = useMemo(
    () => ({
      total: testimonials.length,
      pending: testimonials.filter((item) => !item.is_approved).length,
      approved: testimonials.filter((item) => item.is_approved).length,
      featured: testimonials.filter((item) => item.is_featured).length,
    }),
    [testimonials],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">Testimonials</h1>
          <p className="text-muted-foreground">Review, approve, feature, or remove client testimonials.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={fetchTestimonials} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Testimonial
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total</p><p className="text-3xl font-bold">{stats.total}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Pending</p><p className="text-3xl font-bold">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Approved</p><p className="text-3xl font-bold">{stats.approved}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Featured</p><p className="text-3xl font-bold">{stats.featured}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by client, content, or session type..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquareQuote className="h-5 w-5" />
            Client Testimonials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTestimonials.map((testimonial) => (
                  <TableRow key={testimonial.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {testimonial.photo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={testimonial.photo_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            testimonial.client_name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{testimonial.client_name}</p>
                          <p className="text-xs text-muted-foreground">{testimonial.session_type || 'Client'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><div className="flex items-center gap-1">{renderStars(testimonial.rating)}</div></TableCell>
                    <TableCell className="max-w-[420px] truncate">{testimonial.content}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className={testimonial.is_approved ? statusStyles.approved : statusStyles.pending}>
                          {testimonial.is_approved ? 'Approved' : 'Pending'}
                        </Badge>
                        {testimonial.is_featured && <Badge variant="outline" className={statusStyles.featured}>Featured</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>{formatDate(testimonial.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" title="View" onClick={() => openView(testimonial)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={testimonial.is_approved ? 'Unapprove' : 'Approve'}
                          onClick={() => updateTestimonial(testimonial.id, { is_approved: !testimonial.is_approved })}
                          disabled={saving}
                        >
                          {testimonial.is_approved ? <XCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={testimonial.is_featured ? 'Remove Featured' : 'Feature'}
                          onClick={() => updateTestimonial(testimonial.id, { is_featured: !testimonial.is_featured, is_approved: true })}
                          disabled={saving}
                        >
                          <Star className={`h-4 w-4 ${testimonial.is_featured ? 'fill-primary text-primary' : ''}`} />
                        </Button>
                        <Button variant="ghost" size="icon" title="Delete" className="text-destructive" onClick={() => deleteTestimonial(testimonial.id)} disabled={saving}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTestimonials.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-14 text-center text-muted-foreground">
                      {loading ? (
                        'Loading testimonials...'
                      ) : (
                        <div className="space-y-4">
                          <p>No testimonials found</p>
                          <div className="flex flex-wrap justify-center gap-2">
                            <Button size="sm" onClick={openAddDialog}>
                              <Plus className="mr-2 h-4 w-4" />
                              Add Testimonial
                            </Button>
                            {testimonials.length === 0 && (
                              <Button size="sm" variant="outline" onClick={seedStarterTestimonials} disabled={saving}>
                                Load Starter Testimonials
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={handleAddDialogOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Testimonial</DialogTitle>
            <DialogDescription>Create a testimonial that can be approved and shown on the public website.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client Name</Label>
              <Input
                value={newTestimonial.client_name}
                onChange={(event) => setNewTestimonial((current) => ({ ...current, client_name: event.target.value }))}
                placeholder="Client name"
              />
            </div>
            <div className="space-y-2">
              <Label>Rating</Label>
              <Select
                value={String(newTestimonial.rating)}
                onValueChange={(value) => setNewTestimonial((current) => ({ ...current, rating: Number(value) }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Stars</SelectItem>
                  <SelectItem value="4">4 Stars</SelectItem>
                  <SelectItem value="3">3 Stars</SelectItem>
                  <SelectItem value="2">2 Stars</SelectItem>
                  <SelectItem value="1">1 Star</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={newTestimonial.content}
                onChange={(event) => setNewTestimonial((current) => ({ ...current, content: event.target.value }))}
                placeholder="Write the client testimonial..."
                rows={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Client Photo</Label>
              <div className="rounded-lg border p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                    {addImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={addImage.previewUrl} alt="New testimonial preview" className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-7 w-7" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={optimizingImage || saving}
                      onChange={(event) => {
                        void chooseTestimonialImage(event.target.files?.[0], 'add')
                        event.currentTarget.value = ''
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      JPEG, PNG, or WebP. The browser shrinks it to a fast-loading avatar before upload.
                    </p>
                    {addImage && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span>{addImage.file.name}</span>
                        <span className="text-muted-foreground">
                          {addImage.optimized
                            ? `${formatFileSize(addImage.originalSize)} → ${formatFileSize(addImage.file.size)}`
                            : formatFileSize(addImage.file.size)}
                        </span>
                        <Button type="button" size="sm" variant="ghost" onClick={() => clearSelectedImage('add')}>
                          <X className="mr-1 h-3.5 w-3.5" /> Remove
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={newTestimonial.is_approved ? 'default' : 'outline'}
                onClick={() => setNewTestimonial((current) => ({ ...current, is_approved: !current.is_approved }))}
              >
                {newTestimonial.is_approved ? 'Approved' : 'Pending'}
              </Button>
              <Button
                type="button"
                variant={newTestimonial.is_featured ? 'default' : 'outline'}
                onClick={() => setNewTestimonial((current) => ({ ...current, is_featured: !current.is_featured, is_approved: current.is_featured ? current.is_approved : true }))}
              >
                {newTestimonial.is_featured ? 'Featured' : 'Feature'}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => handleAddDialogOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button onClick={createTestimonial} disabled={saving || optimizingImage}>
              {optimizingImage ? 'Optimizing image...' : saving ? 'Saving...' : 'Add Testimonial'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={handleViewDialogOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Testimonial Details</DialogTitle>
            <DialogDescription>{selectedTestimonial?.client_name}</DialogDescription>
          </DialogHeader>
          {selectedTestimonial && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    {editImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={editImage.previewUrl} alt="Replacement testimonial preview" className="h-full w-full object-cover" />
                    ) : selectedTestimonial.photo_url && !removeExistingPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selectedTestimonial.photo_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      selectedTestimonial.client_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center gap-1">{renderStars(selectedTestimonial.rating)}</div>
                    <p className="font-medium">{selectedTestimonial.client_name}</p>
                    <p className="text-sm text-muted-foreground">{selectedTestimonial.session_type || 'Client'} • {formatDate(selectedTestimonial.created_at)}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Content</Label>
                <Textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} rows={6} />
              </div>
              <div className="space-y-2">
                <Label>Client Photo</Label>
                <div className="rounded-lg border p-4">
                  <div className="space-y-3">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={optimizingImage || saving}
                      onChange={(event) => {
                        void chooseTestimonialImage(event.target.files?.[0], 'edit')
                        event.currentTarget.value = ''
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Choose one image to add or replace the current client photo.</p>
                    {editImage && (
                      <p className="text-xs text-muted-foreground">
                        Ready: {editImage.optimized
                          ? `${formatFileSize(editImage.originalSize)} → ${formatFileSize(editImage.file.size)}`
                          : formatFileSize(editImage.file.size)}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {editImage && (
                        <Button type="button" size="sm" variant="outline" onClick={() => clearSelectedImage('edit')}>
                          <X className="mr-1 h-3.5 w-3.5" /> Cancel Replacement
                        </Button>
                      )}
                      {selectedTestimonial.photo_url && !editImage && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setRemoveExistingPhoto((current) => !current)}
                        >
                          {removeExistingPhoto ? 'Keep Current Photo' : 'Remove Current Photo'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={selectedTestimonial.is_approved ? statusStyles.approved : statusStyles.pending}>
                  {selectedTestimonial.is_approved ? 'Approved' : 'Pending'}
                </Badge>
                {selectedTestimonial.is_featured && <Badge variant="outline" className={statusStyles.featured}>Featured</Badge>}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedTestimonial && (
              <>
                <Button variant="outline" onClick={saveTestimonialDetails} disabled={saving || optimizingImage}>
                  <Upload className="mr-2 h-4 w-4" />
                  {optimizingImage ? 'Optimizing...' : saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={() => updateTestimonial(selectedTestimonial.id, { is_approved: !selectedTestimonial.is_approved })} disabled={saving}>
                  {selectedTestimonial.is_approved ? 'Unapprove' : 'Approve'}
                </Button>
                <Button onClick={() => updateTestimonial(selectedTestimonial.id, { is_featured: !selectedTestimonial.is_featured, is_approved: true })} disabled={saving}>
                  {selectedTestimonial.is_featured ? 'Remove Featured' : 'Feature'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
