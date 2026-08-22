import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/public/navbar'
import { Footer } from '@/components/public/footer'
import { BookingForm } from './booking-form'

export const metadata = {
  title: 'Book a Session | JoeStudio Photography',
  description: 'Schedule your photography session with JoeStudio. Choose from our range of professional photography services.',
}

type BookingPageProps = {
  searchParams: Promise<{ service?: string | string[] }>
}

export default async function BookingPage({ searchParams }: BookingPageProps) {
  const supabase = await createClient()

  const [query, servicesResult, userResult] = await Promise.all([
    searchParams,
    supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false }),
    supabase.auth.getUser(),
  ])

  const services = servicesResult.data || []
  const user = userResult.data.user
  const requestedServiceId = Array.isArray(query.service) ? query.service[0] : query.service
  const initialServiceId = requestedServiceId && services.some((service) => service.id === requestedServiceId)
    ? requestedServiceId
    : null

  let clientInfo = null
  if (user) {
    const [profileResult, clientResult] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle(),
      supabase
        .from('clients')
        .select('*')
        .eq('profile_id', user.id)
        .maybeSingle(),
    ])

    clientInfo = {
      profile: profileResult.data,
      client: clientResult.data,
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
          initialServiceId={initialServiceId}
        />
      </div>
      <Footer />
    </main>
  )
}
