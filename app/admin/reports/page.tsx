'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Camera,
  FileText,
  Download,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CreditCard,
  Percent,
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

type ReportStats = {
  totalRevenue: number
  previousRevenue: number
  totalExpenses: number
  previousExpenses: number
  netProfit: number
  previousNetProfit: number
  totalBookings: number
  previousBookings: number
  completedBookings: number
  newClients: number
  previousNewClients: number
  pendingInvoices: number
  paidInvoices: number
  outstandingAmount: number
  totalDiscounts: number
  topServices: { name: string; count: number; revenue: number }[]
  monthlyRevenue: { month: string; revenue: number; expenses: number }[]
  paymentChannels: { channel: string; amount: number; count: number }[]
  invoiceStatus: { status: string; count: number; amount: number }[]
  bookingStatus: { status: string; count: number }[]
  recentPayments: { date: string; method: string; channel: string; amount: number }[]
  discounts: { invoice: string; client: string; amount: number; reason: string }[]
}

const emptyStats: ReportStats = {
  totalRevenue: 0,
  previousRevenue: 0,
  totalExpenses: 0,
  previousExpenses: 0,
  netProfit: 0,
  previousNetProfit: 0,
  totalBookings: 0,
  previousBookings: 0,
  completedBookings: 0,
  newClients: 0,
  previousNewClients: 0,
  pendingInvoices: 0,
  paidInvoices: 0,
  outstandingAmount: 0,
  totalDiscounts: 0,
  topServices: [],
  monthlyRevenue: [],
  paymentChannels: [],
  invoiceStatus: [],
  bookingStatus: [],
  recentPayments: [],
  discounts: [],
}

function numberValue(value: unknown) {
  return Number(value || 0)
}

function pctChange(current: number, previous: number) {
  if (previous === 0 && current > 0) return 100
  if (previous === 0) return 0
  return ((current - previous) / previous) * 100
}

function ChangeIndicator({ value }: { value: number }) {
  const rounded = Number(value.toFixed(1))
  const isUp = rounded > 0
  const isDown = rounded < 0

  return (
    <div className={`flex items-center gap-1 mt-2 text-sm ${isUp ? 'text-emerald-500' : isDown ? 'text-red-500' : 'text-muted-foreground'}`}>
      {isUp ? <ArrowUpRight className="w-4 h-4" /> : isDown ? <ArrowDownRight className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
      <span>{isUp ? '+' : ''}{rounded}% vs previous period</span>
    </div>
  )
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats>(emptyStats)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange])

  async function fetchStats() {
    setLoading(true)

    try {
      const days = Number.parseInt(dateRange, 10)
      const now = new Date()
      const currentStart = subDays(now, days)
      const previousStart = subDays(currentStart, days)
      const sixMonthsStart = startOfMonth(subMonths(now, 5))

      const currentStartIso = currentStart.toISOString()
      const previousStartIso = previousStart.toISOString()
      const sixMonthsStartIso = sixMonthsStart.toISOString()

      const [paymentsResult, expensesResult, bookingsResult, clientsResult, invoicesResult] = await Promise.all([
        supabase
          .from('payments')
          .select(`
            amount,
            payment_method,
            payment_channel,
            payment_processor,
            payment_date,
            created_at,
            invoice:invoices(
              invoice_number,
              client:clients(full_name, email),
              booking:bookings(service:services(name))
            )
          `)
          .gte('created_at', previousStartIso),
        supabase
          .from('expenses')
          .select('amount, status, expense_date, created_at')
          .gte('created_at', previousStartIso)
          .eq('status', 'approved'),
        supabase
          .from('bookings')
          .select('status, service_id, total_amount, created_at, services(name)')
          .gte('created_at', previousStartIso),
        supabase
          .from('clients')
          .select('id, created_at')
          .gte('created_at', previousStartIso),
        supabase
          .from('invoices')
          .select(`
            invoice_number,
            total_amount,
            payment_status,
            created_at,
            due_date,
            discount_amount,
            discount_reason,
            client:clients(full_name, email)
          `)
          .gte('created_at', previousStartIso),
      ])

      if (paymentsResult.error) throw paymentsResult.error
      if (expensesResult.error) throw expensesResult.error
      if (bookingsResult.error) throw bookingsResult.error
      if (clientsResult.error) throw clientsResult.error
      if (invoicesResult.error) throw invoicesResult.error

      const payments = paymentsResult.data || []
      const expenses = expensesResult.data || []
      const bookings = bookingsResult.data || []
      const clients = clientsResult.data || []
      const invoices = invoicesResult.data || []

      const inCurrent = (dateValue?: string | null) => {
        if (!dateValue) return false
        const date = new Date(dateValue)
        return date >= currentStart && date <= now
      }

      const inPrevious = (dateValue?: string | null) => {
        if (!dateValue) return false
        const date = new Date(dateValue)
        return date >= previousStart && date < currentStart
      }

      const currentPayments = payments.filter((payment) => inCurrent(payment.created_at || payment.payment_date))
      const previousPayments = payments.filter((payment) => inPrevious(payment.created_at || payment.payment_date))
      const currentExpenses = expenses.filter((expense) => inCurrent(expense.created_at))
      const previousExpenses = expenses.filter((expense) => inPrevious(expense.created_at))
      const currentBookings = bookings.filter((booking) => inCurrent(booking.created_at))
      const previousBookings = bookings.filter((booking) => inPrevious(booking.created_at))
      const currentClients = clients.filter((client) => inCurrent(client.created_at))
      const previousClients = clients.filter((client) => inPrevious(client.created_at))
      const currentInvoices = invoices.filter((invoice) => inCurrent(invoice.created_at))

      const totalRevenue = currentPayments.reduce((sum, payment) => sum + numberValue(payment.amount), 0)
      const previousRevenue = previousPayments.reduce((sum, payment) => sum + numberValue(payment.amount), 0)
      const totalExpenses = currentExpenses.reduce((sum, expense) => sum + numberValue(expense.amount), 0)
      const previousExpensesTotal = previousExpenses.reduce((sum, expense) => sum + numberValue(expense.amount), 0)
      const netProfit = totalRevenue - totalExpenses
      const previousNetProfit = previousRevenue - previousExpensesTotal

      const pendingInvoices = currentInvoices.filter((invoice) => invoice.payment_status === 'pending' || invoice.payment_status === 'partial').length
      const paidInvoices = currentInvoices.filter((invoice) => invoice.payment_status === 'paid').length
      const outstandingAmount = currentInvoices
        .filter((invoice) => invoice.payment_status !== 'paid' && invoice.payment_status !== 'cancelled')
        .reduce((sum, invoice) => sum + numberValue(invoice.total_amount), 0)
      const totalDiscounts = currentInvoices.reduce((sum, invoice) => sum + numberValue(invoice.discount_amount), 0)

      const serviceMap = new Map<string, { count: number; revenue: number }>()
      currentBookings.forEach((booking: any) => {
        const serviceName = booking.services?.name || 'Unknown'
        const existing = serviceMap.get(serviceName) || { count: 0, revenue: 0 }
        serviceMap.set(serviceName, {
          count: existing.count + 1,
          revenue: existing.revenue + numberValue(booking.total_amount),
        })
      })
      const topServices = Array.from(serviceMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)

      const monthlyRevenue: { month: string; revenue: number; expenses: number }[] = []
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(now, i))
        const monthEnd = endOfMonth(subMonths(now, i))
        const monthLabel = format(monthStart, 'MMM')

        const monthPayments = payments.filter((payment) => {
          const date = new Date(payment.created_at || payment.payment_date)
          return date >= monthStart && date <= monthEnd
        })

        const monthExpenses = expenses.filter((expense) => {
          const date = new Date(expense.created_at)
          return date >= monthStart && date <= monthEnd
        })

        monthlyRevenue.push({
          month: monthLabel,
          revenue: monthPayments.reduce((sum, payment) => sum + numberValue(payment.amount), 0),
          expenses: monthExpenses.reduce((sum, expense) => sum + numberValue(expense.amount), 0),
        })
      }

      const channelMap = new Map<string, { amount: number; count: number }>()
      currentPayments.forEach((payment: any) => {
        const channel = payment.payment_channel || payment.payment_method || 'Unknown'
        const existing = channelMap.get(channel) || { amount: 0, count: 0 }
        channelMap.set(channel, {
          amount: existing.amount + numberValue(payment.amount),
          count: existing.count + 1,
        })
      })
      const paymentChannels = Array.from(channelMap.entries())
        .map(([channel, data]) => ({ channel, ...data }))
        .sort((a, b) => b.amount - a.amount)

      const invoiceStatusMap = new Map<string, { count: number; amount: number }>()
      currentInvoices.forEach((invoice) => {
        const status = invoice.payment_status || 'pending'
        const existing = invoiceStatusMap.get(status) || { count: 0, amount: 0 }
        invoiceStatusMap.set(status, {
          count: existing.count + 1,
          amount: existing.amount + numberValue(invoice.total_amount),
        })
      })
      const invoiceStatus = Array.from(invoiceStatusMap.entries()).map(([status, data]) => ({ status, ...data }))

      const bookingStatusMap = new Map<string, number>()
      currentBookings.forEach((booking) => {
        const status = booking.status || 'pending'
        bookingStatusMap.set(status, (bookingStatusMap.get(status) || 0) + 1)
      })
      const bookingStatus = Array.from(bookingStatusMap.entries()).map(([status, count]) => ({ status, count }))

      const recentPayments = currentPayments
        .slice(0, 8)
        .map((payment: any) => ({
          date: payment.payment_date || payment.created_at,
          method: payment.payment_method || 'Payment',
          channel: payment.payment_channel || payment.payment_processor || payment.payment_method || 'Unknown',
          amount: numberValue(payment.amount),
        }))

      const discounts = currentInvoices
        .filter((invoice) => numberValue(invoice.discount_amount) > 0)
        .map((invoice: any) => ({
          invoice: invoice.invoice_number,
          client: invoice.client?.full_name || invoice.client?.email || 'Unknown',
          amount: numberValue(invoice.discount_amount),
          reason: invoice.discount_reason || 'No reason recorded',
        }))

      setStats({
        totalRevenue,
        previousRevenue,
        totalExpenses,
        previousExpenses: previousExpensesTotal,
        netProfit,
        previousNetProfit,
        totalBookings: currentBookings.length,
        previousBookings: previousBookings.length,
        completedBookings: currentBookings.filter((booking) => booking.status === 'completed').length,
        newClients: currentClients.length,
        previousNewClients: previousClients.length,
        pendingInvoices,
        paidInvoices,
        outstandingAmount,
        totalDiscounts,
        topServices,
        monthlyRevenue,
        paymentChannels,
        invoiceStatus,
        bookingStatus,
        recentPayments,
        discounts,
      })
    } catch (error) {
      console.error('Reports error:', error)
      toast.error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  function exportReport() {
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', stats.totalRevenue],
      ['Total Expenses', stats.totalExpenses],
      ['Net Profit', stats.netProfit],
      ['Outstanding Amount', stats.outstandingAmount],
      ['Total Discounts', stats.totalDiscounts],
      ['Total Bookings', stats.totalBookings],
      ['Completed Bookings', stats.completedBookings],
      ['New Clients', stats.newClients],
      ['Pending Invoices', stats.pendingInvoices],
      ['Paid Invoices', stats.paidInvoices],
      [],
      ['Top Services'],
      ['Service', 'Bookings', 'Revenue'],
      ...stats.topServices.map((service) => [service.name, service.count, service.revenue]),
      [],
      ['Payment Channels'],
      ['Channel', 'Count', 'Amount'],
      ...stats.paymentChannels.map((channel) => [channel.channel, channel.count, channel.amount]),
    ]

    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `reports-${dateRange}-days.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  const profitMargin = stats.totalRevenue > 0 ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1) : '0'
  const revenueChange = pctChange(stats.totalRevenue, stats.previousRevenue)
  const expenseChange = pctChange(stats.totalExpenses, stats.previousExpenses)
  const profitChange = pctChange(stats.netProfit, stats.previousNetProfit)
  const clientChange = pctChange(stats.newClients, stats.previousNewClients)
  const maxMonthlyValue = Math.max(...stats.monthlyRevenue.map((month) => Math.max(month.revenue, month.expenses)), 1)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Live business performance insights from invoices, payments, bookings and expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[150px] bg-background/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchStats} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Collected Revenue</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(stats.totalRevenue)}</p>
                <ChangeIndicator value={revenueChange} />
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <DollarSign className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved Expenses</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(stats.totalExpenses)}</p>
                <ChangeIndicator value={expenseChange} />
              </div>
              <div className="p-3 rounded-xl bg-red-500/10">
                <TrendingDown className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(stats.netProfit)}</p>
                <div className="flex flex-col gap-1 mt-2 text-primary text-sm">
                  <span>{profitMargin}% margin</span>
                  <ChangeIndicator value={profitChange} />
                </div>
              </div>
              <div className="p-3 rounded-xl bg-primary/10">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">New Clients</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stats.newClients}</p>
                <ChangeIndicator value={clientChange} />
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-background/50 border border-border/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">Monthly Revenue vs Expenses</CardTitle>
                <CardDescription>Last 6 months financial trend from real payments and approved expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.monthlyRevenue.map((month) => (
                    <div key={month.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{month.month}</span>
                        <span className="text-muted-foreground">{formatCurrency(month.revenue)} / {formatCurrency(month.expenses)}</span>
                      </div>
                      <div className="flex gap-1 h-4">
                        <div className="bg-emerald-500 rounded-l" style={{ width: `${Math.max(2, (month.revenue / maxMonthlyValue) * 100)}%` }} />
                        <div className="bg-red-500 rounded-r" style={{ width: `${Math.max(2, (month.expenses / maxMonthlyValue) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-6 pt-4 text-sm">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-500" /><span className="text-muted-foreground">Revenue</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-500" /><span className="text-muted-foreground">Expenses</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">Top Services</CardTitle>
                <CardDescription>Most popular services by booking value</CardDescription>
              </CardHeader>
              <CardContent>
                {stats.topServices.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Camera className="w-10 h-10 text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">No booking data available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats.topServices.map((service, index) => (
                      <div key={service.name} className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">{index + 1}</div>
                        <div className="flex-1 min-w-0"><p className="font-medium truncate">{service.name}</p><p className="text-sm text-muted-foreground">{service.count} bookings</p></div>
                        <div className="text-right"><p className="font-semibold">{formatCurrency(service.revenue)}</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <QuickStat icon={<Calendar className="w-5 h-5 text-purple-500" />} label="Total Bookings" value={stats.totalBookings} />
            <QuickStat icon={<Camera className="w-5 h-5 text-emerald-500" />} label="Completed" value={stats.completedBookings} />
            <QuickStat icon={<FileText className="w-5 h-5 text-amber-500" />} label="Pending Invoices" value={stats.pendingInvoices} />
            <QuickStat icon={<FileText className="w-5 h-5 text-blue-500" />} label="Paid Invoices" value={stats.paidInvoices} />
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader><CardTitle>Revenue by Payment Channel</CardTitle><CardDescription>Actual payment ledger totals</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {stats.paymentChannels.length === 0 ? <Empty icon={<CreditCard className="w-12 h-12" />} text="No payment records yet" /> : stats.paymentChannels.map((item) => (
                  <div key={item.channel} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div><p className="font-medium">{item.channel}</p><p className="text-sm text-muted-foreground">{item.count} payments</p></div>
                    <p className="font-semibold">{formatCurrency(item.amount)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader><CardTitle>Recent Payments</CardTitle><CardDescription>Latest payments in selected period</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {stats.recentPayments.length === 0 ? <Empty icon={<DollarSign className="w-12 h-12" />} text="No recent payments" /> : stats.recentPayments.map((payment, index) => (
                  <div key={`${payment.date}-${index}`} className="flex items-center justify-between border-b pb-3 last:border-0">
                    <div><p className="font-medium">{payment.channel}</p><p className="text-sm text-muted-foreground">{new Date(payment.date).toLocaleDateString()} • {payment.method}</p></div>
                    <p className="font-semibold">{formatCurrency(payment.amount)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader><CardTitle>Invoice Status Breakdown</CardTitle><CardDescription>Invoice value by status</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {stats.invoiceStatus.length === 0 ? <div className="md:col-span-3"><Empty icon={<FileText className="w-12 h-12" />} text="No invoice data" /></div> : stats.invoiceStatus.map((item) => (
                <Card key={item.status}><CardContent className="pt-6"><Badge>{item.status}</Badge><p className="mt-3 text-2xl font-bold">{formatCurrency(item.amount)}</p><p className="text-sm text-muted-foreground">{item.count} invoices</p></CardContent></Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader><CardTitle>Booking Status</CardTitle><CardDescription>Bookings in selected period</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-4">
              {stats.bookingStatus.length === 0 ? <div className="md:col-span-4"><Empty icon={<Calendar className="w-12 h-12" />} text="No booking data" /></div> : stats.bookingStatus.map((item) => (
                <Card key={item.status}><CardContent className="pt-6"><Badge variant="outline">{item.status.replace('_', ' ')}</Badge><p className="mt-3 text-2xl font-bold">{item.count}</p></CardContent></Card>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader><CardTitle>Service Performance</CardTitle><CardDescription>Ranking by booking revenue</CardDescription></CardHeader>
            <CardContent>
              {stats.topServices.length === 0 ? <Empty icon={<Camera className="w-12 h-12" />} text="No service data" /> : (
                <div className="space-y-4">
                  {stats.topServices.map((service) => (
                    <div key={service.name} className="grid grid-cols-3 gap-4 rounded-lg border p-4">
                      <div className="col-span-2"><p className="font-medium">{service.name}</p><p className="text-sm text-muted-foreground">{service.count} bookings</p></div>
                      <p className="text-right font-semibold">{formatCurrency(service.revenue)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader><CardTitle>Discount Report</CardTitle><CardDescription>Applied discounts and reasons</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              {stats.discounts.length === 0 ? <Empty icon={<Percent className="w-12 h-12" />} text="No discounts in selected period" /> : stats.discounts.map((discount) => (
                <div key={discount.invoice} className="grid gap-2 rounded-lg border p-4 md:grid-cols-4">
                  <div><p className="font-medium">{discount.invoice}</p><p className="text-sm text-muted-foreground">{discount.client}</p></div>
                  <p className="font-semibold text-green-600">-{formatCurrency(discount.amount)}</p>
                  <p className="md:col-span-2 text-sm text-muted-foreground">{discount.reason}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function QuickStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted">{icon}</div>
          <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
        </div>
      </CardContent>
    </Card>
  )
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
      <div className="mb-3 opacity-50">{icon}</div>
      <p>{text}</p>
    </div>
  )
}
