import { createClient } from '@/lib/supabase/server'
import { BookingsClient } from './bookings-client'

export default async function BookingsPage() {
  const supabase = await createClient()

  const { data: bookings } = await supabase
    .from('bookings')
    .select('*, service:services(*), client:clients(*, profile:profiles(*)), staff:profiles(*)')
    .order('booking_date', { ascending: false })

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)

  const { data: clients } = await supabase
    .from('clients')
    .select('*, profile:profiles(*)')
    .order('created_at', { ascending: false })

  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, email, studio_role')
    .in('studio_role', ['photographer', 'studio_manager', 'studio_admin', 'super_admin'])
    .eq('is_active', true)

  return (
    <BookingsClient 
      initialBookings={bookings || []} 
      services={services || []}
      clients={clients || []}
      staff={staff || []}
    />
  )
}
