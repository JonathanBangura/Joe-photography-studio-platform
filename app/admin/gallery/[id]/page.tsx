import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { GalleryDetailClient } from './gallery-detail-client'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminGalleryDetailPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()

  const { data: gallery, error } = await supabase
    .from('client_galleries')
    .select('*, client:clients(*, profile:profiles(*)), booking:bookings(*, service:services(*), staff:profiles(*)), photos:client_gallery_photos(*)')
    .eq('id', id)
    .single()

  if (error || !gallery) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <Button asChild variant="outline" size="sm">
        <Link href="/admin/gallery">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Galleries
        </Link>
      </Button>
      <GalleryDetailClient initialGallery={gallery} />
    </div>
  )
}
