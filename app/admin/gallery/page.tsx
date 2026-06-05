import { createClient } from '@/lib/supabase/server'
import { GalleryClient } from './gallery-client'

export default async function AdminGalleryPage() {
  const supabase = await createClient()

  const { data: galleries } = await supabase
    .from('client_galleries')
    .select('*, client:clients(*, profile:profiles(*)), booking:bookings(*, service:services(*)), photos:client_gallery_photos(id, is_selected)')
    .order('created_at', { ascending: false })

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, client:clients(*, profile:profiles(*)), service:services(*)')
    .not('client_id', 'is', null)
    .order('booking_date', { ascending: false })

  return <GalleryClient initialGalleries={galleries || []} bookings={bookings || []} />
}
