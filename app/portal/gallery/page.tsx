import Link from 'next/link'
import { Calendar, Heart, ImageIcon, Images, Lock, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, getPortalGalleries, getPortalSession, isExpired } from '@/lib/portal-data'

export default async function PortalGalleryPage() {
  const { client, supabase } = await getPortalSession()
  if (!client) return null

  const galleries = await getPortalGalleries(client.id, supabase)
  const totalPhotos = galleries.reduce((sum: number, gallery: any) => sum + (gallery.photos?.length || 0), 0)
  const selectedPhotos = galleries.reduce(
    (sum: number, gallery: any) => sum + (gallery.photos || []).filter((photo: any) => photo.is_selected).length,
    0,
  )
  const activeGalleries = galleries.filter((gallery: any) => gallery.is_active && !isExpired(gallery.expires_at))
  const expiredGalleries = galleries.filter((gallery: any) => isExpired(gallery.expires_at) || !gallery.is_active)

  const renderGallery = (gallery: any) => {
    const photoCount = gallery.photos?.length || 0
    const selectedCount = (gallery.photos || []).filter((photo: any) => photo.is_selected).length
    const expired = isExpired(gallery.expires_at)
    const unavailable = !gallery.is_active || expired
    const href = gallery.access_code ? `/gallery/${gallery.access_code}` : null
    const cover = gallery.photos?.[0]?.thumbnail_url || gallery.photos?.[0]?.image_url || null

    return (
      <Card key={gallery.id} className="overflow-hidden">
        <div className="grid md:grid-cols-[220px_1fr]">
          <div className="relative flex aspect-video items-center justify-center bg-muted md:aspect-auto">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={gallery.title} className="h-full w-full object-cover" />
            ) : (
              <Images className="h-12 w-12 text-muted-foreground/40" />
            )}
          </div>
          <div className="p-5">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-semibold">{gallery.title}</h3>
                  <Badge variant="outline" className={unavailable ? 'border-muted bg-muted text-muted-foreground' : 'border-green-500/30 bg-green-500/10 text-green-600'}>
                    {unavailable ? 'Unavailable' : 'Active'}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{gallery.booking?.service?.name || 'Photography Session'} • {formatDate(gallery.booking?.booking_date || gallery.created_at)}</p>
              </div>
              {href && !unavailable ? (
                <Button asChild><Link href={href}><ImageIcon className="mr-2 h-4 w-4" />Open Gallery</Link></Button>
              ) : (
                <Button disabled variant="outline">Gallery unavailable</Button>
              )}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Photos</p>
                <p className="text-xl font-bold">{photoCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Selected</p>
                <p className="text-xl font-bold text-primary">{selectedCount}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Expires</p>
                <p className="font-semibold">{formatDate(gallery.expires_at)}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Galleries</h1>
        <p className="text-muted-foreground">Open active galleries, view photos, and submit your selections.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Galleries</CardTitle><Images className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{galleries.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Photos</CardTitle><ImageIcon className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalPhotos}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Selected</CardTitle><Heart className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{selectedPhotos}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle><Lock className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{activeGalleries.length}</div></CardContent>
        </Card>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Active Galleries</h2>
          <p className="text-sm text-muted-foreground"><Send className="mr-1 inline h-4 w-4" />Selections are submitted from inside each gallery.</p>
        </div>
        {activeGalleries.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">No active galleries yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4">{activeGalleries.map(renderGallery)}</div>
        )}
      </section>

      {expiredGalleries.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Past / Expired Galleries</h2>
          <div className="grid gap-4">{expiredGalleries.map(renderGallery)}</div>
        </section>
      )}
    </div>
  )
}
