import Link from 'next/link'
import { CreditCard, ExternalLink, LinkIcon, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatSle } from '@/lib/currency'
import {
  formatDate,
  formatDateTime,
  getInvoicePaymentSummary,
  getPaymentUrl,
  getPortalInvoices,
  getPortalPaymentLinks,
  getPortalPayments,
  getPortalSession,
  isExpired,
} from '@/lib/portal-data'

const linkStatusClass: Record<string, string> = {
  active: 'border-green-500/30 bg-green-500/10 text-green-600',
  disabled: 'border-muted bg-muted text-muted-foreground',
  expired: 'border-destructive/30 bg-destructive/10 text-destructive',
}

const paymentStatusClass: Record<string, string> = {
  completed: 'border-green-500/30 bg-green-500/10 text-green-600',
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
  failed: 'border-destructive/30 bg-destructive/10 text-destructive',
}

function methodLabel(value?: string | null) {
  const method = String(value || '').replace(/_/g, ' ')
  return method ? method.charAt(0).toUpperCase() + method.slice(1) : 'Payment'
}

export default async function PortalPaymentsPage() {
  const { client, supabase } = await getPortalSession()
  if (!client) return null

  const [invoices, paymentLinks] = await Promise.all([
    getPortalInvoices(client.id, supabase),
    getPortalPaymentLinks(client.id, supabase),
  ])

  const payments = await getPortalPayments(invoices.map((invoice: any) => invoice.id), supabase)
  const totalPaid = payments
    .filter((payment: any) => payment.payment_status !== 'failed')
    .reduce((sum: number, payment: any) => sum + Number(payment.applied_amount ?? payment.amount ?? 0), 0)
  const totalTips = payments
    .filter((payment: any) => payment.payment_status !== 'failed')
    .reduce((sum: number, payment: any) => sum + Number(payment.tip_amount || 0), 0)
  const totalBalance = invoices.reduce((sum: number, invoice: any) => sum + getInvoicePaymentSummary(invoice).balanceSle, 0)
  const activeLinks = paymentLinks.filter((link: any) => link.status === 'active' && !isExpired(link.expires_at))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Payments</h1>
        <p className="text-muted-foreground">Use active payment links and view payment history.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Links</CardTitle>
            <LinkIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{activeLinks.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Paid</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold text-green-600">{formatSle(totalPaid)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Tips</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold text-primary">{formatSle(totalTips)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Balance</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold text-amber-600">{formatSle(totalBalance)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Links</CardTitle>
        </CardHeader>
        <CardContent>
          {paymentLinks.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No payment links found.</p>
          ) : (
            <div className="grid gap-4">
              {paymentLinks.map((link: any) => {
                const url = getPaymentUrl(link)
                const invoiceSummary = link.invoice ? getInvoicePaymentSummary(link.invoice) : null
                const expired = isExpired(link.expires_at)
                const status = expired && link.status === 'active' ? 'expired' : link.status
                return (
                  <div key={link.id} className="rounded-lg border p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{link.invoice?.invoice_number || link.booking?.booking_reference || 'Payment Link'}</p>
                          <Badge variant="outline" className={linkStatusClass[status] || linkStatusClass.disabled}>{status}</Badge>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{link.booking?.service?.name || 'Photography Session'} • Expires {formatDate(link.expires_at)}</p>
                        {invoiceSummary && (
                          <p className="mt-2 text-sm">
                            Balance: <span className="font-semibold">{formatSle(invoiceSummary.balanceSle)}</span>
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {url && status === 'active' && invoiceSummary && invoiceSummary.balanceSle > 0 ? (
                          <Button asChild><Link href={url}><Wallet className="mr-2 h-4 w-4" />Open Payment</Link></Button>
                        ) : (
                          <Button disabled variant="outline">Unavailable</Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="py-12 text-center">
              <CreditCard className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No payments recorded yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Tip</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment: any) => (
                    <TableRow key={payment.id}>
                      <TableCell>{formatDateTime(payment.payment_date || payment.created_at)}</TableCell>
                      <TableCell>
                        <p className="font-medium">{payment.invoice?.invoice_number || 'Invoice'}</p>
                        <p className="text-xs text-muted-foreground">{payment.invoice?.booking?.service?.name || ''}</p>
                      </TableCell>
                      <TableCell>{methodLabel(payment.payment_method || payment.payment_channel)}</TableCell>
                      <TableCell>{formatSle(Number(payment.applied_amount ?? payment.amount ?? 0))}</TableCell>
                      <TableCell>{Number(payment.tip_amount || 0) > 0 ? formatSle(payment.tip_amount) : '-'}</TableCell>
                      <TableCell><Badge variant="outline" className={paymentStatusClass[payment.payment_status] || paymentStatusClass.completed}>{payment.payment_status || 'completed'}</Badge></TableCell>
                      <TableCell className="max-w-[180px] truncate text-muted-foreground">{payment.transaction_id || payment.customer_reference || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
