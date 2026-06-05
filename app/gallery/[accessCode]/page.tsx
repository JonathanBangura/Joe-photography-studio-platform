import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Camera, Calendar, Clock, Lock, User } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Navbar } from '@/components/public/navbar'
import { Footer } from '@/components/public/footer'
import { createClient } from '@/lib/supabase/server'
import { ClientGalleryAccess } from './client-gallery-access'

type PageProps = {
  params: Promise<{ accessCode: string }>
}

function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatTime(value?: string | null) {
  if (!value) return ''
  return value.slice(0, 5)
}

function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

export default async function ClientGalleryPage({ params }: PageProps) {
  const { accessCode } = await params
  const normalizedCode = decodeURIComponent(accessCode || '').trim()

  if (!normalizedCode) {
    notFound()
  }

  const supabase = await createClient()

  const { data: gallery, error } = await supabase
    .from('client_galleries')
    .select(`
      *,
      client:clients(*, profile:profiles(*)),
      booking:bookings(*, service:services(*), staff:profiles(*)),
      photos:client_gallery_photos(*)
    `)
    .ilike('access_code', normalizedCode)
    .maybeSingle()

  if (error) {
    console.error('Gallery lookup error:', error)
  }

  if (!gallery) {
    notFound()
  }

  const galleryExpired = isExpired(gallery.expires_at)
  const photos = gallery.photos || []

  const clientName =
    gallery.client?.full_name ||
    gallery.client?.profile?.full_name ||
    gallery.client?.email ||
    'Client'

  const serviceName = gallery.booking?.service?.name || 'Photography Session'

  const bookingReference =
    gallery.booking?.booking_reference ||
    gallery.booking_id?.slice(0, 8) ||
    'N/A'

  if (!gallery.is_active || galleryExpired) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24">
          <section className="px-4 py-24">
            <div className="container mx-auto max-w-2xl">
              <Card>
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <div className="mb-6 rounded-full bg-muted p-5">
                    <Lock className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h1 className="mb-3 text-3xl font-bold">Gallery unavailable</h1>
                  <p className="mb-6 text-muted-foreground">
                    This private gallery is either unpublished, expired, or no longer available.
                  </p>
                  <Button asChild>
                    <Link href="/contact">Contact Studio</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24">
        <section className="border-b bg-muted/30 px-4 py-12">
          <div className="container mx-auto max-w-7xl">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <Badge className="mb-4">Private Client Gallery</Badge>
                <h1 className="text-4xl font-serif font-bold md:text-5xl">
                  {gallery.title}
                </h1>
                <p className="mt-3 max-w-2xl text-muted-foreground">
                  Welcome {clientName}. View your private gallery and enjoy the memories captured by the studio.
                </p>
              </div>

              <div className="rounded-xl border bg-background p-4 shadow-sm">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Access Code
                </p>
                <p className="font-mono text-2xl font-bold">
                  {gallery.access_code}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <User className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Client</p>
                    <p className="font-medium">{clientName}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Camera className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Session</p>
                    <p className="font-medium">{serviceName}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Shoot Date</p>
                    <p className="font-medium">
                      {formatDate(gallery.booking?.booking_date)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-xs text-muted-foreground">Booking Ref</p>
                    <p className="font-medium">{bookingReference}</p>
                    {gallery.booking?.start_time && (
                      <p className="text-xs text-muted-foreground">
                        {formatTime(gallery.booking.start_time)}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <ClientGalleryAccess gallery={gallery} photos={photos} />
      </main>

      <Footer />
    </div>
  )
}