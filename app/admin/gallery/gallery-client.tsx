'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Check, Copy, Eye, Images, LinkIcon, Loader2, Plus, Search, Shield, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { generateGalleryAccessCode, getGalleryTitle } from '@/lib/gallery'
import { createAuditLog } from '@/lib/audit-log-client'
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

type BookingRecord = {
  id: string
  booking_reference: string | null
  booking_date: string
  start_time: string
  end_time: string
  status: string | null
  client_id: string | null
  service_id: string | null
  client?: ClientRecord | null
  service?: ServiceRecord | null
}

type GalleryPhotoRecord = {
  id: string
  is_selected: boolean | null
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

interface GalleryClientProps {
  initialGalleries: GalleryRecord[]
  bookings: BookingRecord[]
}

function getClientName(client?: ClientRecord | null) {
  return client?.full_name || client?.profile?.full_name || client?.email || client?.profile?.email || 'Unknown Client'
}

function getClientEmail(client?: ClientRecord | null) {
  return client?.email || client?.profile?.email || 'No email'
}

function getPhotoCount(gallery: GalleryRecord) {
  return gallery.photos?.length || 0
}

function getSelectedCount(gallery: GalleryRecord) {
  return gallery.photos?.filter((photo) => photo.is_selected).length || 0
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString()
}

export function GalleryClient({ initialGalleries, bookings }: GalleryClientProps) {
  const router = useRouter()
  const [galleries, setGalleries] = useState(initialGalleries)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState('')
  const [customTitle, setCustomTitle] = useState('')
  const [expiresAt, setExpiresAt] = useState('')

  const galleryBookingIds = useMemo(
    () => new Set(galleries.map((gallery) => gallery.booking_id).filter(Boolean)),
    [galleries],
  )

  const availableBookings = useMemo(() => {
    return bookings.filter((booking) => booking.client_id && !galleryBookingIds.has(booking.id))
  }, [bookings, galleryBookingIds])

  const filteredGalleries = useMemo(() => {
    const query = searchQuery.toLowerCase().trim()
    return galleries.filter((gallery) => {
      const clientName = getClientName(gallery.client).toLowerCase()
      const clientEmail = getClientEmail(gallery.client).toLowerCase()
      const bookingRef = gallery.booking?.booking_reference?.toLowerCase() || ''
      const matchesSearch = !query || gallery.title.toLowerCase().includes(query) || clientName.includes(query) || clientEmail.includes(query) || bookingRef.includes(query) || gallery.access_code?.toLowerCase().includes(query)
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'published' ? gallery.is_active : !gallery.is_active)
      return matchesSearch && matchesStatus
    })
  }, [galleries, searchQuery, statusFilter])

  const selectedBooking = bookings.find((booking) => booking.id === selectedBookingId)

  const copyGalleryLink = async (accessCode?: string | null) => {
    if (!accessCode) return
    const link = `${window.location.origin}/gallery/${accessCode}`
    await navigator.clipboard.writeText(link)
    toast.success('Gallery link copied')
  }

  const refreshGalleries = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('client_galleries')
      .select('*, client:clients(*, profile:profiles(*)), booking:bookings(*, service:services(*)), photos:client_gallery_photos(id, is_selected)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      toast.error('Failed to refresh galleries')
      return
    }

    setGalleries((data || []) as GalleryRecord[])
    router.refresh()
  }

  const createGallery = async () => {
    if (!selectedBooking) {
      toast.error('Select a booking first')
      return
    }

    if (!selectedBooking.client_id) {
      toast.error('This booking has no linked client')
      return
    }

    setIsCreating(true)
    const supabase = createClient()

    const accessCode = generateGalleryAccessCode()
    const title = customTitle.trim() || getGalleryTitle(getClientName(selectedBooking.client), selectedBooking.booking_reference)

  const response = await fetch("/api/admin/client-galleries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      booking_id: selectedBooking.id,
      client_id: selectedBooking.client_id,
      title: galleryTitle,
      expires_at: expiryDate || null,
    }),
  })

  const result = await response.json()

  if (!response.ok) {
    throw new Error(result.error || "Failed to create gallery")
  }

    await createAuditLog({
      action: 'create_gallery',
      resource_type: 'client_gallery',
      resource_id: data.id,
      new_data: data,
    })

    toast.success('Gallery created')
    setGalleries([data as GalleryRecord, ...galleries])
    setSelectedBookingId('')
    setCustomTitle('')
    setExpiresAt('')
    setIsCreateOpen(false)
    setIsCreating(false)
    router.refresh()
  }

  const togglePublish = async (gallery: GalleryRecord) => {
    const supabase = createClient()
    const nextStatus = !gallery.is_active

    const { data, error } = await supabase
      .from('client_galleries')
      .update({ is_active: nextStatus })
      .eq('id', gallery.id)
      .select('*, client:clients(*, profile:profiles(*)), booking:bookings(*, service:services(*)), photos:client_gallery_photos(id, is_selected)')
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

    setGalleries(galleries.map((item) => (item.id === gallery.id ? (data as GalleryRecord) : item)))
    toast.success(nextStatus ? 'Gallery published' : 'Gallery moved to draft')
    router.refresh()
  }

  const totalPhotos = galleries.reduce((sum, gallery) => sum + getPhotoCount(gallery), 0)
  const publishedCount = galleries.filter((gallery) => gallery.is_active).length
  const draftCount = galleries.length - publishedCount
  const selectedPhotos = galleries.reduce((sum, gallery) => sum + getSelectedCount(gallery), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Client Galleries</h1>
          <p className="text-muted-foreground">Create private galleries from bookings and manage client access links.</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Gallery
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Client Gallery</DialogTitle>
              <DialogDescription>Select a booking, generate an access code, and prepare a draft gallery for photo upload.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Booking</Label>
                <Select value={selectedBookingId} onValueChange={(value) => {
                  setSelectedBookingId(value)
                  const booking = bookings.find((item) => item.id === value)
                  if (booking) setCustomTitle(getGalleryTitle(getClientName(booking.client), booking.booking_reference))
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select booking" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBookings.length === 0 ? (
                      <SelectItem value="none" disabled>No bookings available</SelectItem>
                    ) : availableBookings.map((booking) => (
                      <SelectItem key={booking.id} value={booking.id}>
                        {booking.booking_reference || booking.id.slice(0, 8)} · {getClientName(booking.client)} · {booking.service?.name || 'Service'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedBooking && (
                <Card>
                  <CardContent className="pt-6 text-sm grid gap-2 sm:grid-cols-2">
                    <div><span className="text-muted-foreground">Client:</span> {getClientName(selectedBooking.client)}</div>
                    <div><span className="text-muted-foreground">Email:</span> {getClientEmail(selectedBooking.client)}</div>
                    <div><span className="text-muted-foreground">Service:</span> {selectedBooking.service?.name || 'Not set'}</div>
                    <div><span className="text-muted-foreground">Date:</span> {formatDate(selectedBooking.booking_date)}</div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2">
                <Label htmlFor="gallery-title">Gallery Title</Label>
                <Input id="gallery-title" value={customTitle} onChange={(event) => setCustomTitle(event.target.value)} placeholder="Client Gallery - Booking Reference" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expires-at">Expiry Date (optional)</Label>
                <Input id="expires-at" type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
              <Button onClick={createGallery} disabled={isCreating || !selectedBookingId || selectedBookingId === 'none'}>
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create Draft Gallery
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Galleries</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{galleries.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Published</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{publishedCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Drafts</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{draftCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Selected Photos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{selectedPhotos}/{totalPhotos}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>Galleries</CardTitle>
              <CardDescription>Private client galleries linked to bookings.</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9 sm:w-72" placeholder="Search galleries..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
              </div>
              <Select value={statusFilter} onValueChange={(value: 'all' | 'draft' | 'published') => setStatusFilter(value)}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredGalleries.length === 0 ? (
            <div className="py-14 text-center">
              <Images className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="font-semibold">No client galleries found</h3>
              <p className="mb-4 text-sm text-muted-foreground">Create a gallery from a booking to start delivering photos.</p>
              <Button onClick={() => setIsCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Create Gallery</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gallery</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Booking</TableHead>
                  <TableHead>Photos</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Access</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGalleries.map((gallery) => (
                  <TableRow key={gallery.id}>
                    <TableCell>
                      <div className="font-medium">{gallery.title}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" /> {formatDate(gallery.created_at)}</div>
                    </TableCell>
                    <TableCell>
                      <div>{getClientName(gallery.client)}</div>
                      <div className="text-xs text-muted-foreground">{getClientEmail(gallery.client)}</div>
                    </TableCell>
                    <TableCell>
                      <div>{gallery.booking?.booking_reference || gallery.booking_id?.slice(0, 8) || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{gallery.booking?.service?.name || 'Service not set'}</div>
                    </TableCell>
                    <TableCell>
                      <div>{getPhotoCount(gallery)} photos</div>
                      <div className="text-xs text-muted-foreground">{getSelectedCount(gallery)} selected</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={gallery.is_active ? 'default' : 'secondary'}>{gallery.is_active ? 'Published' : 'Draft'}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-sm">{gallery.access_code}</div>
                      {gallery.expires_at && <div className="text-xs text-muted-foreground">Expires {formatDate(gallery.expires_at)}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button asChild size="sm" variant="outline"><Link href={`/admin/gallery/${gallery.id}`}><Eye className="mr-2 h-4 w-4" />View</Link></Button>
                        <Button size="sm" variant="outline" onClick={() => copyGalleryLink(gallery.access_code)}><Copy className="mr-2 h-4 w-4" />Link</Button>
                        <Button size="sm" variant={gallery.is_active ? 'secondary' : 'default'} onClick={() => togglePublish(gallery)}>
                          {gallery.is_active ? <X className="mr-2 h-4 w-4" /> : <Check className="mr-2 h-4 w-4" />}
                          {gallery.is_active ? 'Unpublish' : 'Publish'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Shield className="h-4 w-4" />Phase 5A scope</CardTitle>
          <CardDescription>This release creates private galleries and access links. Photo uploads and client selections come in Phase 5B/5D.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
