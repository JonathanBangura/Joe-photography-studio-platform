import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, Calendar, Copy, ImageIcon, LinkIcon, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function getClientName(client: any) {
  return client?.full_name || client?.profile?.full_name || client?.email || client?.profile?.email || 'Unknown Client'
}

function getClientEmail(client: any) {
  return client?.email || client?.profile?.email || 'No email'
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString()
}

export default async function GalleryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: gallery } = await supabase
    .from('client_galleries')
    .select('*, client:clients(*, profile:profiles(*)), booking:bookings(*, service:services(*), staff:profiles(*)), photos:client_gallery_photos(*)')
    .eq('id', id)
    .single()

  if (!gallery) notFound()

  const photos = gallery.photos || []
  const selectedCount = photos.filter((photo: any) => photo.is_selected).length
  const accessPath = gallery.access_code ? `/gallery/${gallery.access_code}` : '#'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon"><Link href="/admin/gallery"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-3xl font-bold">{gallery.title}</h1>
            <p className="text-muted-foreground">Private client gallery details and delivery status.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link href={accessPath} target="_blank"><LinkIcon className="mr-2 h-4 w-4" />Open Client Link</Link></Button>
          <Badge className="px-3 py-2" variant={gallery.is_active ? 'default' : 'secondary'}>{gallery.is_active ? 'Published' : 'Draft'}</Badge>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Photos</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{photos.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Selected</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{selectedCount}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Access Code</CardTitle></CardHeader><CardContent><div className="font-mono text-lg font-bold">{gallery.access_code || 'N/A'}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Expires</CardTitle></CardHeader><CardContent><div className="text-lg font-bold">{formatDate(gallery.expires_at)}</div></CardContent></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />Client Information</CardTitle>
            <CardDescription>Client linked to this gallery.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Name</span><span className="font-medium text-right">{getClientName(gallery.client)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Email</span><span className="font-medium text-right">{getClientEmail(gallery.client)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Phone</span><span className="font-medium text-right">{gallery.client?.phone || gallery.client?.profile?.phone || 'Not set'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Address</span><span className="font-medium text-right">{gallery.client?.address || 'Not set'}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" />Booking Information</CardTitle>
            <CardDescription>Booking connected to this gallery.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Reference</span><span className="font-medium text-right">{gallery.booking?.booking_reference || gallery.booking_id?.slice(0, 8) || 'N/A'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Service</span><span className="font-medium text-right">{gallery.booking?.service?.name || 'Not set'}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Shoot Date</span><span className="font-medium text-right">{formatDate(gallery.booking?.booking_date)}</span></div>
            <div className="flex justify-between gap-4"><span className="text-muted-foreground">Photographer</span><span className="font-medium text-right">{gallery.booking?.staff?.full_name || 'Not assigned'}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" />Gallery Photos</CardTitle>
          <CardDescription>Photo upload is the next phase. This table will show all uploaded photos and client selections.</CardDescription>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <div className="py-12 text-center">
              <ImageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="font-semibold">No photos uploaded yet</h3>
              <p className="text-sm text-muted-foreground">Phase 5B will add Supabase Storage uploads for this gallery.</p>
            </div>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Selected</TableHead><TableHead>Created</TableHead></TableRow></TableHeader>
              <TableBody>
                {photos.map((photo: any) => (
                  <TableRow key={photo.id}>
                    <TableCell>{photo.title || photo.image_url?.split('/').pop() || photo.id}</TableCell>
                    <TableCell><Badge variant={photo.is_selected ? 'default' : 'secondary'}>{photo.is_selected ? 'Selected' : 'Not Selected'}</Badge></TableCell>
                    <TableCell>{formatDate(photo.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
