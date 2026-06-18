'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'
import { formatSle, formatUsd } from '@/lib/currency'
import {
  Banknote,
  CreditCard,
  Download,
  FileText,
  Percent,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'

type PaymentRecord = {
  id: string
  invoice_id: string | null
  amount: number
  payment_method: string | null
  payment_channel?: string | null
  payment_processor?: string | null
  transaction_id: string | null
  customer_reference?: string | null
  payment_status?: string | null
  payment_date: string | null
  notes: string | null
  created_at: string
  invoice?: {
    invoice_number: string
    total_amount: number
    total_amount_sle?: number | null
    exchange_rate?: number | null
    discount_amount?: number | null
    discount_amount_sle?: number | null
    client?: {
      full_name?: string | null
      email?: string | null
      phone?: string | null
      profile?: { full_name: string | null; email: string | null } | null
    } | null
    booking?: { service?: { name: string } | null } | null
  } | null
}

type InvoiceRecord = {
  id: string
  invoice_number: string
  amount: number
  subtotal_amount?: number | null
  discount_amount?: number | null
  discount_amount_sle?: number | null
  discount_type?: string | null
  discount_value?: number | null
  discount_reason?: string | null
  total_amount: number
  total_amount_sle?: number | null
  exchange_rate?: number | null
  payment_status: string
  created_at: string
  due_date: string | null
  client?: {
    full_name?: string | null
    email?: string | null
    phone?: string | null
    profile?: { full_name: string | null; email: string | null } | null
  } | null
  booking?: { service?: { name: string } | null } | null
  payments?: { amount: number }[] | null
}

const dateRanges = {
  '7': 'Last 7 days',
  '30': 'Last 30 days',
  '90': 'Last 90 days',
  '365': 'Last year',
  all: 'All time',
}

function rate(value?: number | null) {
  return Number(value || 24) || 24
}

function toSle(usd: number, exchangeRate: number) {
  return Number((Number(usd || 0) * exchangeRate).toFixed(2))
}

function toUsd(sle: number, exchangeRate: number) {
  return Number((Number(sle || 0) / exchangeRate).toFixed(2))
}

function invoiceSle(invoice: Pick<InvoiceRecord, 'total_amount' | 'total_amount_sle' | 'exchange_rate'>) {
  return Number(invoice.total_amount_sle ?? toSle(Number(invoice.total_amount || 0), rate(invoice.exchange_rate)))
}

function invoiceDiscountSle(invoice: Pick<InvoiceRecord, 'discount_amount' | 'discount_amount_sle' | 'exchange_rate'>) {
  return Number(invoice.discount_amount_sle ?? toSle(Number(invoice.discount_amount || 0), rate(invoice.exchange_rate)))
}

function dualMoney(sle: number, usd?: number | null, exchangeRate = 24) {
  return `${formatSle(sle)} / ${formatUsd(usd ?? toUsd(sle, exchangeRate))}`
}

function getStartDate(range: string) {
  if (range === 'all') return null
  const date = new Date()
  date.setDate(date.getDate() - Number(range))
  return date.toISOString()
}

function getClientName(client?: PaymentRecord['invoice']['client'] | InvoiceRecord['client']) {
  return client?.full_name || client?.profile?.full_name || client?.email || client?.profile?.email || 'Unknown Client'
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const escapeValue = (value: unknown) => {
    const text = String(value ?? '')
    return `"${text.replace(/"/g, '""')}"`
  }
  return [headers.join(','), ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(','))].join('\n')
}

function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows)
  if (!csv) {
    toast.error('No data to export')
    return
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function FinanceDashboardPage() {
  const supabase = createClient()
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchFinanceData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  async function fetchFinanceData() {
    setLoading(true)
    const startDate = getStartDate(dateRange)

    let paymentsQuery = supabase
      .from('payments')
      .select(`
        *,
        invoice:invoices(
          invoice_number,
          total_amount,
          total_amount_sle,
          exchange_rate,
          discount_amount,
          discount_amount_sle,
          client:clients(*, profile:profiles(full_name, email)),
          booking:bookings(service:services(name))
        )
      `)
      .order('payment_date', { ascending: false })

    let invoicesQuery = supabase
      .from('invoices')
      .select(`
        *,
        client:clients(*, profile:profiles(full_name, email)),
        booking:bookings(service:services(name)),
        payments(amount)
      `)
      .order('created_at', { ascending: false })

    if (startDate) {
      paymentsQuery = paymentsQuery.gte('created_at', startDate)
      invoicesQuery = invoicesQuery.gte('created_at', startDate)
    }

    const [{ data: paymentData, error: paymentError }, { data: invoiceData, error: invoiceError }] = await Promise.all([
      paymentsQuery,
      invoicesQuery,
    ])

    if (paymentError || invoiceError) {
      console.error({ paymentError, invoiceError })
      toast.error('Failed to load finance data')
    } else {
      setPayments((paymentData || []) as PaymentRecord[])
      setInvoices((invoiceData || []) as InvoiceRecord[])
    }

    setLoading(false)
  }

  const invoiceRows = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return invoices.map((invoice) => {
      const paidAmount = (invoice.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      const totalSle = invoiceSle(invoice)
      const balance = Math.max(totalSle - paidAmount, 0)
      const derivedStatus = invoice.payment_status !== 'paid' && invoice.due_date && invoice.due_date < today ? 'overdue' : invoice.payment_status
      return { ...invoice, paidAmount, totalSle, balance, derivedStatus }
    })
  }, [invoices])

  const stats = useMemo(() => {
    const collected = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
    const outstanding = invoiceRows.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0)
    const discounts = invoices.reduce((sum, invoice) => sum + invoiceDiscountSle(invoice), 0)
    const invoiceTotal = invoices.reduce((sum, invoice) => sum + invoiceSle(invoice), 0)
    const paidInvoices = invoiceRows.filter((invoice) => invoice.payment_status === 'paid').length
    const pendingInvoices = invoiceRows.filter((invoice) => invoice.payment_status !== 'paid').length
    const averageInvoice = invoices.length ? invoiceTotal / invoices.length : 0

    return { collected, outstanding, discounts, invoiceTotal, paidInvoices, pendingInvoices, averageInvoice }
  }, [payments, invoices, invoiceRows])

  const paymentByMethod = useMemo(() => {
    const map = new Map<string, { amount: number; usd: number }>()
    payments.forEach((payment) => {
      const key = payment.payment_channel || payment.payment_method || 'Unknown'
      const previous = map.get(key) || { amount: 0, usd: 0 }
      const amount = Number(payment.amount || 0)
      map.set(key, {
        amount: previous.amount + amount,
        usd: previous.usd + toUsd(amount, rate(payment.invoice?.exchange_rate)),
      })
    })
    return Array.from(map.entries()).map(([method, values]) => ({ method, ...values })).sort((a, b) => b.amount - a.amount)
  }, [payments])

  const revenueByService = useMemo(() => {
    const map = new Map<string, { paid: number; paidUsd: number; invoices: number; discounts: number; discountsUsd: number }>()
    invoiceRows.forEach((invoice) => {
      const service = invoice.booking?.service?.name || 'Unknown Service'
      const previous = map.get(service) || { paid: 0, paidUsd: 0, invoices: 0, discounts: 0, discountsUsd: 0 }
      map.set(service, {
        paid: previous.paid + Number(invoice.paidAmount || 0),
        paidUsd: previous.paidUsd + toUsd(Number(invoice.paidAmount || 0), rate(invoice.exchange_rate)),
        invoices: previous.invoices + 1,
        discounts: previous.discounts + invoiceDiscountSle(invoice),
        discountsUsd: previous.discountsUsd + Number(invoice.discount_amount || 0),
      })
    })
    return Array.from(map.entries()).map(([service, values]) => ({ service, ...values })).sort((a, b) => b.paid - a.paid)
  }, [invoiceRows])

  const discountRows = useMemo(() => {
    return invoiceRows.filter((invoice) => Number(invoice.discount_amount || 0) > 0)
  }, [invoiceRows])

  const filteredPayments = payments.filter((payment) => {
    const query = search.toLowerCase()
    return (
      payment.invoice?.invoice_number?.toLowerCase().includes(query) ||
      getClientName(payment.invoice?.client).toLowerCase().includes(query) ||
      String(payment.payment_method || '').toLowerCase().includes(query) ||
      String(payment.payment_channel || '').toLowerCase().includes(query) ||
      String(payment.transaction_id || '').toLowerCase().includes(query)
    )
  })

  function exportPayments() {
    downloadCsv(
      `payment-ledger-${new Date().toISOString().slice(0, 10)}.csv`,
      filteredPayments.map((payment) => ({
        date: payment.payment_date || payment.created_at,
        invoice: payment.invoice?.invoice_number || '',
        client: getClientName(payment.invoice?.client),
        amount: Number(payment.amount || 0),
        amount_usd_estimate: toUsd(Number(payment.amount || 0), rate(payment.invoice?.exchange_rate)),
        method: payment.payment_method || '',
        channel: payment.payment_channel || '',
        processor: payment.payment_processor || '',
        transaction_id: payment.transaction_id || '',
        customer_reference: payment.customer_reference || '',
        status: payment.payment_status || 'completed',
        notes: payment.notes || '',
      })),
    )
  }

  function exportDiscounts() {
    downloadCsv(
      `discount-report-${new Date().toISOString().slice(0, 10)}.csv`,
      discountRows.map((invoice) => ({
        invoice: invoice.invoice_number,
        client: getClientName(invoice.client),
        service: invoice.booking?.service?.name || '',
        subtotal: Number(invoice.subtotal_amount ?? invoice.amount ?? 0),
        discount_type: invoice.discount_type || '',
        discount_value: invoice.discount_value || 0,
        discount_amount_sle: invoiceDiscountSle(invoice),
        discount_amount_usd: invoice.discount_amount || 0,
        final_total: invoice.total_amount,
        final_total_sle: invoiceSle(invoice),
        reason: invoice.discount_reason || '',
        created_at: invoice.created_at,
      })),
    )
  }

  function exportRevenueByService() {
    downloadCsv(`revenue-by-service-${new Date().toISOString().slice(0, 10)}.csv`, revenueByService)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance Dashboard</h1>
          <p className="text-muted-foreground">Revenue, outstanding balances, payment channels, and discount reporting.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(dateRanges).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchFinanceData} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Collected Revenue</CardTitle><Wallet className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatSle(stats.collected)}</div><p className="text-xs text-muted-foreground">{formatUsd(toUsd(stats.collected, 24))} from payment ledger</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Outstanding</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatSle(stats.outstanding)}</div><p className="text-xs text-muted-foreground">{formatUsd(toUsd(stats.outstanding, 24))} remaining invoice balances</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Discounts Given</CardTitle><Percent className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatSle(stats.discounts)}</div><p className="text-xs text-muted-foreground">{formatUsd(toUsd(stats.discounts, 24))} approved reductions</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Average Invoice</CardTitle><TrendingUp className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{formatSle(stats.averageInvoice)}</div><p className="text-xs text-muted-foreground">{formatUsd(toUsd(stats.averageInvoice, 24))} after discounts</p></CardContent></Card>
      </div>

      <Tabs defaultValue="ledger" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto justify-start">
          <TabsTrigger value="ledger">Payment Ledger</TabsTrigger>
          <TabsTrigger value="methods">Payment Channels</TabsTrigger>
          <TabsTrigger value="services">Revenue by Service</TabsTrigger>
          <TabsTrigger value="discounts">Discounts</TabsTrigger>
        </TabsList>

        <TabsContent value="ledger">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div><CardTitle>Payment Ledger</CardTitle><CardDescription>Every recorded payment across invoices.</CardDescription></div>
                <div className="flex gap-2"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search payments..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><Button variant="outline" onClick={exportPayments}><Download className="mr-2 h-4 w-4" />Export</Button></div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Method</TableHead><TableHead>Reference</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>{new Date(payment.payment_date || payment.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono">{payment.invoice?.invoice_number || 'N/A'}</TableCell>
                      <TableCell>{getClientName(payment.invoice?.client)}</TableCell>
                      <TableCell><div className="space-y-1"><Badge variant="outline">{payment.payment_channel || payment.payment_method || 'Unknown'}</Badge>{payment.payment_processor && <p className="text-xs text-muted-foreground">{payment.payment_processor}</p>}</div></TableCell>
                      <TableCell>{payment.transaction_id || payment.customer_reference || '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{dualMoney(Number(payment.amount || 0), null, rate(payment.invoice?.exchange_rate))}</TableCell>
                    </TableRow>
                  ))}
                  {filteredPayments.length === 0 && <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">{loading ? 'Loading payments...' : 'No payments found'}</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="methods">
          <Card>
            <CardHeader><CardTitle>Revenue by Payment Channel</CardTitle><CardDescription>Cash, bank transfer, mobile money, Vult app, card and other channels.</CardDescription></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {paymentByMethod.map((item) => {
                  const percentage = stats.collected > 0 ? (item.amount / stats.collected) * 100 : 0
                  return <div key={item.method} className="rounded-lg border p-4"><div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2"><CreditCard className="h-4 w-4 text-muted-foreground" /><span className="font-medium">{item.method}</span></div><strong>{dualMoney(item.amount, item.usd)}</strong></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${percentage}%` }} /></div><p className="mt-1 text-xs text-muted-foreground">{percentage.toFixed(1)}% of collected revenue</p></div>
                })}
                {paymentByMethod.length === 0 && <p className="py-8 text-center text-muted-foreground">No payment channels yet.</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between"><div><CardTitle>Revenue by Service</CardTitle><CardDescription>Which services generate the most paid revenue.</CardDescription></div><Button variant="outline" onClick={exportRevenueByService}><Download className="mr-2 h-4 w-4" />Export</Button></div>
            </CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Service</TableHead><TableHead>Invoices</TableHead><TableHead>Discounts</TableHead><TableHead className="text-right">Paid Revenue</TableHead></TableRow></TableHeader><TableBody>{revenueByService.map((item) => <TableRow key={item.service}><TableCell>{item.service}</TableCell><TableCell>{item.invoices}</TableCell><TableCell>{dualMoney(item.discounts, item.discountsUsd)}</TableCell><TableCell className="text-right font-semibold">{dualMoney(item.paid, item.paidUsd)}</TableCell></TableRow>)}{revenueByService.length === 0 && <TableRow><TableCell colSpan={4} className="py-10 text-center text-muted-foreground">No service revenue yet.</TableCell></TableRow>}</TableBody></Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="discounts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between"><div><CardTitle>Discount Report</CardTitle><CardDescription>Audit discounts given to clients.</CardDescription></div><Button variant="outline" onClick={exportDiscounts}><Download className="mr-2 h-4 w-4" />Export</Button></div>
            </CardHeader>
            <CardContent>
              <Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Service</TableHead><TableHead>Reason</TableHead><TableHead className="text-right">Discount</TableHead></TableRow></TableHeader><TableBody>{discountRows.map((invoice) => <TableRow key={invoice.id}><TableCell className="font-mono">{invoice.invoice_number}</TableCell><TableCell>{getClientName(invoice.client)}</TableCell><TableCell>{invoice.booking?.service?.name || 'N/A'}</TableCell><TableCell className="max-w-[320px] truncate">{invoice.discount_reason || '-'}</TableCell><TableCell className="text-right font-semibold text-green-600">-{dualMoney(invoiceDiscountSle(invoice), invoice.discount_amount || 0, rate(invoice.exchange_rate))}</TableCell></TableRow>)}{discountRows.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No discounts found.</TableCell></TableRow>}</TableBody></Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
