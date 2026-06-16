import Link from 'next/link'
import { ArrowRight, Calendar, CheckCircle, CreditCard, Image, ReceiptText, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatSle, formatUsd } from '@/lib/currency'
import {
  formatDate,
  getInvoicePaymentSummary,
  getPaymentUrl,
  getPortalBookings,
  getPortalGalleries,
  getPortalInvoices,
  getPortalPaymentLinks,
  getPortalSession,
  getPrimaryPaymentLink,
  isExpired,
} from '@/lib/portal-data'

const statusClass: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  confirmed: 'bg-green-500/10 text-green-600 border-green-500/30',
  in_progress: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  completed: 'bg-primary/10 text-primary border-primary/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/30',
}

export default async function PortalDashboard() {
  const { user, profile, client, supabase } = await getPortalSession()

  if (!client) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Client profile unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Please contact the studio so we can link your account to your client record.</p>
        </CardContent>
      </Card>
    )
  }

  const [bookings, invoices, galleries, paymentLinks] = await Promise.all([
    getPortalBookings(client.id, supabase),
    getPortalInvoices(client.id, supabase),
    getPortalGalleries(client.id, supabase),
    getPortalPaymentLinks(client.id, supabase),
  ])

  const today = new Date().toISOString().split('T')[0]
  const upcomingBookings = bookings
    .filter((booking: any) => booking.status !== 'completed' && booking.status !== 'cancelled' && booking.booking_date >= today)
    .sort((a: any, b: any) => `${a.booking_date}${a.start_time}`.localeCompare(`${b.booking_date}${b.start_time}`))
    .slice(0, 3)

  const invoiceSummaries = invoices.map((invoice: any) => ({ invoice, summary: getInvoicePaymentSummary(invoice) }))
  const totalBalance = invoiceSummaries.reduce((sum, item) => sum + item.summary.balanceSle, 0)
  const pendingInvoices = invoiceSummaries.filter((item) => item.summary.balanceSle > 0)
  const activeGalleries = galleries.filter((gallery: any) => gallery.is_active && !isExpired(gallery.expires_at))
  const activePaymentLinks = paymentLinks.filter((link: any) => link.status === 'active' && !isExpired(link.expires_at))
  const firstName = (profile?.full_name || client.full_name || user.email || 'there').split(' ')[0]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">Welcome back, {firstName}</h1>
        <p className="mt-1 text-muted-foreground">Track your bookings, invoices, payments, and galleries.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
            <p className="text-xs text-muted-foreground">{upcomingBookings.length} upcoming</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSle(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">Outstanding payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invoices.length}</div>
            <p className="text-xs text-muted-foreground">{pendingInvoices.length} pending</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Galleries</CardTitle>
            <Image className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{galleries.length}</div>
            <p className="text-xs text-muted-foreground">{activeGalleries.length} active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Upcoming Sessions</CardTitle>
            <Link href="/portal/bookings" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {upcomingBookings.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
                <p className="mb-4 text-muted-foreground">No upcoming sessions</p>
                <Button asChild variant="outline" size="sm"><Link href="/booking">Book a Session</Link></Button>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingBookings.map((booking: any) => (
                  <div key={booking.id} className="flex items-center gap-4 rounded-lg bg-muted/50 p-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{booking.service?.name || 'Photography Session'}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(booking.booking_date)} at {booking.start_time?.slice(0, 5)}</p>
                    </div>
                    <Badge className={statusClass[booking.status] || statusClass.pending} variant="outline">{booking.status?.replace('_', ' ')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingInvoices.length > 0 && (
                <Link href="/portal/invoices" className="block">
                  <div className="flex items-center gap-4 rounded-lg bg-primary/10 p-3 transition-colors hover:bg-primary/20">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-primary">{pendingInvoices.length} invoice{pendingInvoices.length === 1 ? '' : 's'} need payment</p>
                      <p className="text-sm text-muted-foreground">Outstanding: {formatSle(totalBalance)}</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-primary" />
                  </div>
                </Link>
              )}

              {activePaymentLinks.length > 0 && (
                <Link href="/portal/payments" className="block">
                  <div className="flex items-center gap-4 rounded-lg bg-amber-500/10 p-3 transition-colors hover:bg-amber-500/20">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                      <Wallet className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-amber-700">{activePaymentLinks.length} active payment link{activePaymentLinks.length === 1 ? '' : 's'}</p>
                      <p className="text-sm text-muted-foreground">Pay by Vult, mobile money, or card</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-amber-600" />
                  </div>
                </Link>
              )}

              {activeGalleries.length > 0 && (
                <Link href="/portal/gallery" className="block">
                  <div className="flex items-center gap-4 rounded-lg bg-blue-500/10 p-3 transition-colors hover:bg-blue-500/20">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                      <Image className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-blue-700">{activeGalleries.length} active gallery{activeGalleries.length === 1 ? '' : 'ies'}</p>
                      <p className="text-sm text-muted-foreground">View photos and submit selections</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-blue-600" />
                  </div>
                </Link>
              )}

              {pendingInvoices.length === 0 && activePaymentLinks.length === 0 && activeGalleries.length === 0 && (
                <div className="flex items-center gap-4 rounded-lg bg-green-500/10 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500/20">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-600">All caught up!</p>
                    <p className="text-sm text-muted-foreground">No pending actions required</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
          <Link href="/portal/invoices" className="text-sm text-primary hover:underline">View all</Link>
        </CardHeader>
        <CardContent>
          {invoiceSummaries.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="divide-y">
              {invoiceSummaries.slice(0, 4).map(({ invoice, summary }: any) => {
                const paymentLink = getPrimaryPaymentLink(invoice.payment_links)
                const paymentUrl = getPaymentUrl(paymentLink)
                return (
                  <div key={invoice.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{invoice.invoice_number}</p>
                      <p className="text-sm text-muted-foreground">{invoice.booking?.service?.name || 'Photography Session'} • {formatUsd(summary.totalUsd)} / {formatSle(summary.totalSle)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={summary.status === 'paid' ? 'border-green-500/30 bg-green-500/10 text-green-600' : 'border-amber-500/30 bg-amber-500/10 text-amber-600'}>
                        {summary.status}
                      </Badge>
                      {paymentUrl && summary.balanceSle > 0 && (
                        <Button asChild size="sm"><Link href={paymentUrl}>Pay Now</Link></Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
