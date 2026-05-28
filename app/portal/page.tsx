import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Calendar,
  Image,
  FileText,
  CreditCard,
  ArrowRight,
  Clock,
  CheckCircle,
} from 'lucide-react'

export default async function PortalDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  // Get client record
  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('profile_id', user.id)
    .single()

  // Get upcoming bookings
  const { data: upcomingBookings } = await supabase
    .from('bookings')
    .select('*, service:services(*)')
    .eq('client_id', client?.id)
    .in('status', ['pending', 'confirmed'])
    .gte('booking_date', new Date().toISOString().split('T')[0])
    .order('booking_date')
    .limit(3)

  // Get recent galleries
  const { data: galleries } = await supabase
    .from('client_galleries')
    .select('*, photos:client_gallery_photos(count)')
    .eq('client_id', client?.id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(3)

  // Get pending invoices
  const { data: pendingInvoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('client_id', client?.id)
    .in('payment_status', ['pending', 'partial'])

  // Get unsigned contracts
  const { data: unsignedContracts } = await supabase
    .from('contracts')
    .select('*, booking:bookings(*, service:services(*))')
    .eq('client_id', client?.id)
    .is('signed_at', null)

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-serif text-3xl font-bold">
          Welcome back, {profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your photography sessions and galleries.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Link href="/booking">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Book Session</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portal/galleries">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <Image className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">View Galleries</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portal/contracts">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Contracts</span>
            </CardContent>
          </Card>
        </Link>
        <Link href="/portal/invoices">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Invoices</span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Upcoming Bookings & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Upcoming Sessions</CardTitle>
            <Link href="/portal/bookings" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {!upcomingBookings || upcomingBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground mb-4">No upcoming sessions</p>
                <Link href="/booking">
                  <Button variant="outline" size="sm">
                    Book a Session
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{booking.service?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.booking_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })} at {booking.start_time?.slice(0, 5)}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                      booking.status === 'confirmed' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                      {booking.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Unsigned contracts */}
              {unsignedContracts && unsignedContracts.length > 0 && (
                <Link href="/portal/contracts" className="block">
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-amber-500">
                        {unsignedContracts.length} contract{unsignedContracts.length > 1 ? 's' : ''} to sign
                      </p>
                      <p className="text-sm text-muted-foreground">Review and sign your contracts</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-amber-500" />
                  </div>
                </Link>
              )}

              {/* Pending invoices */}
              {pendingInvoices && pendingInvoices.length > 0 && (
                <Link href="/portal/invoices" className="block">
                  <div className="flex items-center gap-4 p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-primary">
                        {pendingInvoices.length} pending invoice{pendingInvoices.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total: ${pendingInvoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0).toLocaleString()}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-primary" />
                  </div>
                </Link>
              )}

              {/* All clear */}
              {(!unsignedContracts || unsignedContracts.length === 0) && 
               (!pendingInvoices || pendingInvoices.length === 0) && (
                <div className="flex items-center gap-4 p-3 rounded-lg bg-green-500/10">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="font-medium text-green-500">All caught up!</p>
                    <p className="text-sm text-muted-foreground">No pending actions required</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Galleries */}
      {galleries && galleries.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Your Galleries</CardTitle>
            <Link href="/portal/galleries" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {galleries.map((gallery) => (
                <Link key={gallery.id} href={`/portal/galleries/${gallery.id}`}>
                  <div className="p-4 rounded-lg border border-border hover:border-primary/50 transition-colors">
                    <div className="w-full aspect-video rounded-lg bg-muted flex items-center justify-center mb-3">
                      <Image className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                    <p className="font-medium truncate">{gallery.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(gallery.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
