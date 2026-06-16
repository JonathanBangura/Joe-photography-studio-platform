import Link from 'next/link'
import { CalendarDays, CreditCard, ReceiptText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatSle, formatUsd } from '@/lib/currency'
import {
  formatDate,
  getInvoicePaymentSummary,
  getPaymentUrl,
  getPortalInvoices,
  getPortalSession,
  getPrimaryPaymentLink,
} from '@/lib/portal-data'

const statusClasses: Record<string, string> = {
  paid: 'border-green-500/30 bg-green-500/10 text-green-600',
  partial: 'border-blue-500/30 bg-blue-500/10 text-blue-600',
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-600',
  overdue: 'border-destructive/30 bg-destructive/10 text-destructive',
}

export default async function PortalInvoicesPage() {
  const { client, supabase } = await getPortalSession()
  if (!client) return null

  const invoices = await getPortalInvoices(client.id, supabase)
  const summaries = invoices.map((invoice: any) => ({ invoice, summary: getInvoicePaymentSummary(invoice) }))
  const totalUsd = summaries.reduce((sum, item) => sum + item.summary.totalUsd, 0)
  const totalSle = summaries.reduce((sum, item) => sum + item.summary.totalSle, 0)
  const paidSle = summaries.reduce((sum, item) => sum + item.summary.paidSle, 0)
  const balanceSle = summaries.reduce((sum, item) => sum + item.summary.balanceSle, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Invoices</h1>
        <p className="text-muted-foreground">View your invoice balances and continue payments.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{invoices.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Value</CardTitle></CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{formatSle(totalSle)}</div>
            <p className="text-xs text-muted-foreground">{formatUsd(totalUsd)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Paid</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold text-green-600">{formatSle(paidSle)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Balance</CardTitle></CardHeader>
          <CardContent><div className="text-xl font-bold text-amber-600">{formatSle(balanceSle)}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <div className="py-12 text-center">
              <ReceiptText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-muted-foreground">No invoices found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map(({ invoice, summary }: any) => {
                    const paymentLink = getPrimaryPaymentLink(invoice.payment_links)
                    const paymentUrl = getPaymentUrl(paymentLink)
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <p className="font-medium">{invoice.invoice_number}</p>
                          <p className="text-xs text-muted-foreground">Due {formatDate(invoice.due_date)}</p>
                        </TableCell>
                        <TableCell>{invoice.booking?.service?.name || 'Photography Session'}</TableCell>
                        <TableCell><span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" />{formatDate(invoice.created_at)}</span></TableCell>
                        <TableCell>{formatSle(summary.totalSle)}<br /><span className="text-xs text-muted-foreground">{formatUsd(summary.totalUsd)}</span></TableCell>
                        <TableCell>{formatSle(summary.paidSle)}</TableCell>
                        <TableCell className="font-medium">{formatSle(summary.balanceSle)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusClasses[summary.status] || statusClasses.pending}>{summary.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {paymentUrl && summary.balanceSle > 0 ? (
                            <Button asChild size="sm"><Link href={paymentUrl}><CreditCard className="mr-2 h-4 w-4" />Pay</Link></Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">{summary.balanceSle <= 0 ? 'Paid' : 'No link'}</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
