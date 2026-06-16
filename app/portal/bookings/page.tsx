import Link from 'next/link'
import { Calendar, Clock, CreditCard, ImageIcon, MapPin, ReceiptText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatSle, formatUsd } from '@/lib/currency'
import {
  formatDate,
  getInvoicePaymentSummary,
  getPaymentUrl,
  getPortalBookings,
  getPortalGalleries,
  getPortalInvoices,
  getPortalSession,
  getPrimaryPaymentLink,
} from '@/lib/portal-data'

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  confirmed: 'bg-green-500/10 text-green-600 border-green-500/30',
  in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  completed: 'bg-primary/10 text-primary border-primary/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
}

function firstInvoiceForBooking(invoices: any[], bookingId: string) {
  return invoices.find((invoice) => invoice.booking_id === bookingId)
}

export default async function PortalBookingsPage() {
  const { client, supabase } = await getPortalSession()

  if (!client) return null

  const [bookings, invoices, galleries] = await Promise.all([
    getPortalBookings(client.id, supabase),
    getPortalInvoices(client.id, supabase),
    getPortalGalleries(client.id, supabase),
  ])

  const today = new Date().toISOString().split('T')[0]
  const upcomingBookings = bookings.filter((booking: any) => booking.status !== 'completed' && booking.status !== 'cancelled' && booking.booking_date >= today)
  const pastBookings = bookings.filter((booking: any) => booking.status === 'completed' || booking.status === 'cancelled' || booking.booking_date < today)

  const renderBooking = (booking: any, isPast = false) => {
    const invoice = firstInvoiceForBooking(invoices, booking.id)
    const summary = invoice ? getInvoicePaymentSummary(invoice) : null
    const paymentLink = invoice ? getPrimaryPaymentLink(invoice.payment_links) : null
    const paymentUrl = getPaymentUrl(paymentLink)
    const gallery = galleries.find((item: any) => item.booking_id === booking.id && item.access_code)
    const galleryLink = gallery?.access_code ? `/gallery/${gallery.access_code}` : null

    return (
      <Card key={booking.id} className={isPast ? 'overflow-hidden opacity-80 transition-opacity hover:opacity-100' : 'overflow-hidden'}>
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row">
            <div className={isPast ? 'flex flex-col items-center justify-center bg-muted p-6 md:w-32' : 'flex flex-col items-center justify-center bg-primary/10 p-6 md:w-32'}>
              <span className={isPast ? 'text-3xl font-bold' : 'text-3xl font-bold text-primary'}>
                {new Date(booking.booking_date).getDate()}
              </span>
              <span className="text-sm text-muted-foreground">
                {new Date(booking.booking_date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
              </span>
            </div>

            <div className="flex-1 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{booking.service?.name || 'Photography Session'}</h3>
                  <p className="text-xs text-muted-foreground">{booking.booking_reference || booking.id}</p>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatDate(booking.booking_date)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}</span>
                    <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{booking.location || booking.resource?.name || 'Studio'}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={statusStyles[booking.status] || statusStyles.pending} variant="outline">
                    {String(booking.status || 'pending').replace('_', ' ')}
                  </Badge>
                  {summary && (
                    <Badge variant="outline" className={summary.status === 'paid' ? 'border-green-500/30 bg-green-500/10 text-green-600' : 'border-amber-500/30 bg-amber-500/10 text-amber-600'}>
                      {summary.status === 'paid' ? 'Paid' : 'Balance Due'}
                    </Badge>
                  )}
                </div>
              </div>

              {booking.notes && <p className="mt-4 text-sm text-muted-foreground">{booking.notes}</p>}

              <div className="mt-5 grid gap-3 border-t pt-4 md:grid-cols-3">
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="font-semibold">
                    {formatUsd(Number(booking.total_amount || 0))} / {formatSle(Number(booking.total_amount_sle || (Number(booking.total_amount || 0) * Number(booking.exchange_rate || 24))))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Deposit</p>
                  <p className="font-semibold capitalize">
                    {booking.deposit_status || 'required'} • {formatSle(Number(booking.deposit_paid_amount_sle || booking.deposit_paid_amount || 0))} paid
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-semibold">{summary ? formatSle(summary.balanceSle) : 'Invoice pending'}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap justify-end gap-2">
                {invoice && (
                  <Button asChild variant="outline" size="sm">
                    <Link href="/portal/invoices"><ReceiptText className="mr-2 h-4 w-4" />View Invoice</Link>
                  </Button>
                )}
                {galleryLink && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={galleryLink}><ImageIcon className="mr-2 h-4 w-4" />View Gallery</Link>
                  </Button>
                )}
                {paymentUrl && summary && summary.balanceSle > 0 && (
                  <Button asChild size="sm">
                    <Link href={paymentUrl}><CreditCard className="mr-2 h-4 w-4" />Pay Now</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground">View your upcoming and past sessions.</p>
        </div>
        <Button asChild><Link href="/portal/bookings/new"><Calendar className="mr-2 h-4 w-4" />Book New Session</Link></Button>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Upcoming Sessions</h2>
        {upcomingBookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">No upcoming sessions scheduled.</p>
              <Button asChild className="mt-4"><Link href="/portal/bookings/new">Book a Session</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">{upcomingBookings.map((booking: any) => renderBooking(booking))}</div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">Past Sessions</h2>
        {pastBookings.length === 0 ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">No past sessions yet.</CardContent></Card>
        ) : (
          <div className="grid gap-4">{pastBookings.map((booking: any) => renderBooking(booking, true))}</div>
        )}
      </section>
    </div>
  )
}
