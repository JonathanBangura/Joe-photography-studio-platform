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
    .select('*')
    .eq('is_active', true)
    .order('base_price')

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
          availability={[]}
          blockedDates={[]}
          clientInfo={clientInfo}
          isLoggedIn={!!user}
        />
      </div>
      <Footer />
    </main>
  )
}
