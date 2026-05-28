import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/public/navbar'
import { Footer } from '@/components/public/footer'
import { BookingForm } from './booking-form'

export const metadata = {
  title: 'Book a Session | JoeStudio Photography',
  description: 'Schedule your photography session with JoeStudio. Choose from our range of professional photography services.',
}

export default async function BookingPage() {
  const supabase = await createClient()

  // Get active services
  const { data: services } = await supabase
    .from('services')
    .select('*, addons:service_addons(*)')
    .eq('is_active', true)
    .order('sort_order')

  // Get availability settings
  const { data: availability } = await supabase
    .from('availability')
    .select('*')
    .eq('is_available', true)

  // Get blocked dates for next 3 months
  const today = new Date()
  const threeMonthsLater = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate())
  
  const { data: blockedDates } = await supabase
    .from('blocked_dates')
    .select('blocked_date')
    .gte('blocked_date', today.toISOString().split('T')[0])
    .lte('blocked_date', threeMonthsLater.toISOString().split('T')[0])

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser()

  let clientInfo = null
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('profile_id', user.id)
      .single()

    clientInfo = {
      profile,
      client,
    }
  }

  return (
    <main className="min-h-screen">
      <Navbar />
      <div className="pt-20">
        <BookingForm
          services={services || []}
          availability={availability || []}
          blockedDates={blockedDates?.map(d => d.blocked_date) || []}
          clientInfo={clientInfo}
          isLoggedIn={!!user}
        />
      </div>
      <Footer />
    </main>
  )
}
