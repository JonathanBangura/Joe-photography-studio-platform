import { BookingForm } from '@/app/booking/booking-form'
import { getPortalSession } from '@/lib/portal-data'

export const metadata = {
  title: 'Book New Session | Client Portal',
}

export default async function PortalNewBookingPage() {
  const { profile, client, supabase } = await getPortalSession()

  const { data: services } = await supabase
    .from('services')
    .select('*')
    .eq('is_active', true)
    .order('base_price')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Book New Session</h1>
        <p className="text-muted-foreground">
          Choose a package and schedule it under your client account.
        </p>
      </div>

      <BookingForm
        services={services || []}
        availability={[]}
        blockedDates={[]}
        clientInfo={{
          profile: profile
            ? {
                id: profile.id,
                full_name: profile.full_name,
                email: profile.email,
                phone: profile.phone,
              }
            : null,
          client: client
            ? {
                id: client.id,
                address: client.address,
                city: client.city,
              }
            : null,
        }}
        isLoggedIn
        mode="portal"
      />
    </div>
  )
}
