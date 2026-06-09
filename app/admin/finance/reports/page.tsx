'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { createClient } from '@/lib/supabase/client'
import { Download, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

type PaymentRow = {
  id: string
  amount: number
  payment_method: string | null
  payment_channel?: string | null
  payment_processor?: string | null
  transaction_id: string | null
  payment_date: string | null
  created_at: string
  invoice?: { invoice_number: string; client?: { full_name?: string | null; email?: string | null } | null } | null
}

type InvoiceRow = {
  id: string
  invoice_number: string
  total_amount: number
  discount_amount?: number | null
  payment_status: string
  created_at: string
  client?: { full_name?: string | null; email?: string | null } | null
  payments?: { amount: number }[] | null
}

function money(value: number | null | undefined) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function getMonthKey(value: string) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function toCsv(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  return [headers.join(','), ...rows.map((row) => headers.map((header) => `"${String(row[header] ?? '').replace(/"/g, '""')}"`).join(','))].join('\n')
}

function downloadCsv(name: string, rows: Record<string, unknown>[]) {
  const csv = toCsv(rows)
  if (!csv) {
    toast.error('No data to export')
    return
  }
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function FinanceReportsPage() {
  const supabase = createClient()
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [invoices, setInvoices] = useState<InvoiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [reportType, setReportType] = useState('monthly')

  useEffect(() => {
    fetchReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchReports() {
    setLoading(true)
    const [{ data: paymentData, error: paymentError }, { data: invoiceData, error: invoiceError }] = await Promise.all([
      supabase.from('payments').select('*, invoice:invoices(invoice_number, client:clients(full_name, email))').order('created_at', { ascending: false }),
      supabase.from('invoices').select('*, client:clients(full_name, email), payments(amount)').order('created_at', { ascending: false }),
    ])

    if (paymentError || invoiceError) {
      console.error({ paymentError, invoiceError })
      toast.error('Failed to load reports')
    } else {
      setPayments((paymentData || []) as PaymentRow[])
      setInvoices((invoiceData || []) as InvoiceRow[])
    }
    setLoading(false)
  }

  const monthlyRows = useMemo(() => {
    const map = new Map<string, { month: string; collected: number; invoiced: number; discounts: number; outstanding: number }>()

    invoices.forEach((invoice) => {
      const key = getMonthKey(invoice.created_at)
      const existing = map.get(key) || { month: key, collected: 0, invoiced: 0, discounts: 0, outstanding: 0 }
      const paid = (invoice.payments || []).reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
      existing.invoiced += Number(invoice.total_amount || 0)
      existing.discounts += Number(invoice.discount_amount || 0)
      existing.outstanding += Math.max(Number(invoice.total_amount || 0) - paid, 0)
      map.set(key, existing)
    })

    payments.forEach((payment) => {
      const key = getMonthKey(payment.payment_date || payment.created_at)
      const existing = map.get(key) || { month: key, collected: 0, invoiced: 0, discounts: 0, outstanding: 0 }
      existing.collected += Number(payment.amount || 0)
      map.set(key, existing)
    })

    return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month))
  }, [payments, invoices])

  const channelRows = useMemo(() => {
    const map = new Map<string, { channel: string; collected: number; transactions: number }>()
    payments.forEach((payment) => {
      const key = payment.payment_channel || payment.payment_method || 'Unknown'
      const existing = map.get(key) || { channel: key, collected: 0, transactions: 0 }
      existing.collected += Number(payment.amount || 0)
      existing.transactions += 1
      map.set(key, existing)
    })
    return Array.from(map.values()).sort((a, b) => b.collected - a.collected)
  }, [payments])

  const activeRows = reportType === 'channels' ? channelRows : monthlyRows

  function exportActive() {
    downloadCsv(`finance-${reportType}-${new Date().toISOString().slice(0, 10)}.csv`, activeRows)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Finance Reports</h1>
          <p className="text-muted-foreground">Export monthly finance summaries and channel reports.</p>
        </div>
        <div className="flex gap-2">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="monthly">Monthly Summary</SelectItem><SelectItem value="channels">Payment Channels</SelectItem></SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchReports} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
          <Button onClick={exportActive}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{reportType === 'channels' ? 'Payment Channel Report' : 'Monthly Finance Summary'}</CardTitle>
          <CardDescription>{reportType === 'channels' ? 'Collected revenue grouped by payment channel.' : 'Invoiced, collected, discounts, and outstanding balances by month.'}</CardDescription>
        </CardHeader>
        <CardContent>
          {reportType === 'channels' ? (
            <Table><TableHeader><TableRow><TableHead>Channel</TableHead><TableHead>Transactions</TableHead><TableHead className="text-right">Collected</TableHead></TableRow></TableHeader><TableBody>{channelRows.map((row) => <TableRow key={row.channel}><TableCell>{row.channel}</TableCell><TableCell>{row.transactions}</TableCell><TableCell className="text-right font-semibold">{money(row.collected)}</TableCell></TableRow>)}{channelRows.length === 0 && <TableRow><TableCell colSpan={3} className="py-10 text-center text-muted-foreground">No channel data found.</TableCell></TableRow>}</TableBody></Table>
          ) : (
            <Table><TableHeader><TableRow><TableHead>Month</TableHead><TableHead>Invoiced</TableHead><TableHead>Collected</TableHead><TableHead>Discounts</TableHead><TableHead className="text-right">Outstanding</TableHead></TableRow></TableHeader><TableBody>{monthlyRows.map((row) => <TableRow key={row.month}><TableCell>{row.month}</TableCell><TableCell>{money(row.invoiced)}</TableCell><TableCell>{money(row.collected)}</TableCell><TableCell>{money(row.discounts)}</TableCell><TableCell className="text-right font-semibold">{money(row.outstanding)}</TableCell></TableRow>)}{monthlyRows.length === 0 && <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">No monthly data found.</TableCell></TableRow>}</TableBody></Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
