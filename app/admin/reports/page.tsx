'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
} from 'lucide-react'
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns'

type ReportStats = {
  totalRevenue: number
  totalExpenses: number
  netProfit: number
  totalBookings: number
  completedBookings: number
  newClients: number
  pendingInvoices: number
  paidInvoices: number
  topServices: { name: string; count: number; revenue: number }[]
  monthlyRevenue: { month: string; revenue: number; expenses: number }[]
}

export default function ReportsPage() {
  const [stats, setStats] = useState<ReportStats>({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalBookings: 0,
    completedBookings: 0,
    newClients: 0,
    pendingInvoices: 0,
    paidInvoices: 0,
    topServices: [],
    monthlyRevenue: [],
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const supabase = createClient()

  useEffect(() => {
    fetchStats()
  }, [dateRange])

  async function fetchStats() {
    setLoading(true)
    const days = parseInt(dateRange)
    const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd')

    // Fetch invoices for revenue
    const { data: invoices } = await supabase
      .from('invoices')
      .select('total_amount, payment_status, created_at')
      .gte('created_at', startDate)

    // Fetch expenses
    const { data: expenses } = await supabase
      .from('expenses')
      .select('amount, status, created_at')
      .gte('created_at', startDate)
      .eq('status', 'approved')

    // Fetch bookings
    const { data: bookings } = await supabase
      .from('bookings')
      .select('status, service_id, total_amount, created_at, services(name)')
      .gte('created_at', startDate)

    // Fetch new clients
    const { data: clients } = await supabase
      .from('clients')
      .select('id, created_at')
      .gte('created_at', startDate)

    // Calculate stats
    const totalRevenue = invoices?.filter(i => i.payment_status === 'paid')
      .reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0) || 0
    
    const totalExpenses = expenses?.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) || 0
    
    const pendingInvoices = invoices?.filter(i => i.payment_status === 'pending').length || 0
    const paidInvoices = invoices?.filter(i => i.payment_status === 'paid').length || 0

    // Calculate top services
    const serviceMap = new Map<string, { count: number; revenue: number }>()
    bookings?.forEach((b: any) => {
      const serviceName = b.services?.name || 'Unknown'
      const existing = serviceMap.get(serviceName) || { count: 0, revenue: 0 }
      serviceMap.set(serviceName, {
        count: existing.count + 1,
        revenue: existing.revenue + (Number(b.total_amount) || 0),
      })
    })
    const topServices = Array.from(serviceMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    // Calculate monthly data (last 6 months)
    const monthlyRevenue: { month: string; revenue: number; expenses: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const monthStart = startOfMonth(subMonths(new Date(), i))
      const monthEnd = endOfMonth(subMonths(new Date(), i))
      const monthLabel = format(monthStart, 'MMM')

      const monthInvoices = invoices?.filter((inv) => {
        const date = new Date(inv.created_at)
        return date >= monthStart && date <= monthEnd && inv.payment_status === 'paid'
      }) || []

      const monthExpenses = expenses?.filter((exp) => {
        const date = new Date(exp.created_at)
        return date >= monthStart && date <= monthEnd
      }) || []

      monthlyRevenue.push({
        month: monthLabel,
        revenue: monthInvoices.reduce((sum, i) => sum + (Number(i.total_amount) || 0), 0),
        expenses: monthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
      })
    }

    setStats({
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      totalBookings: bookings?.length || 0,
      completedBookings: bookings?.filter(b => b.status === 'completed').length || 0,
      newClients: clients?.length || 0,
      pendingInvoices,
      paidInvoices,
      topServices,
      monthlyRevenue,
    })

    setLoading(false)
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const profitMargin = stats.totalRevenue > 0 
    ? ((stats.netProfit / stats.totalRevenue) * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground">Business performance insights and financial reports</p>
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
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/50 bg-card/50 backdrop-blur">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(stats.totalRevenue)}</p>
                <div className="flex items-center gap-1 mt-2 text-emerald-500 text-sm">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+12.5%</span>
                </div>
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
                <p className="text-sm text-muted-foreground">Total Expenses</p>
                <p className="text-2xl font-bold text-foreground mt-1">{formatCurrency(stats.totalExpenses)}</p>
                <div className="flex items-center gap-1 mt-2 text-red-500 text-sm">
                  <ArrowDownRight className="w-4 h-4" />
                  <span>-3.2%</span>
                </div>
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
                <div className="flex items-center gap-1 mt-2 text-primary text-sm">
                  <span>{profitMargin}% margin</span>
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
                <div className="flex items-center gap-1 mt-2 text-blue-500 text-sm">
                  <ArrowUpRight className="w-4 h-4" />
                  <span>+8.1%</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Details */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-background/50 border border-border/50">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="bookings">Bookings</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Monthly Trend */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">Monthly Revenue vs Expenses</CardTitle>
                <CardDescription>Last 6 months financial trend</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {stats.monthlyRevenue.map((month) => (
                    <div key={month.month} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{month.month}</span>
                        <span className="text-muted-foreground">
                          {formatCurrency(month.revenue)} / {formatCurrency(month.expenses)}
                        </span>
                      </div>
                      <div className="flex gap-1 h-4">
                        <div
                          className="bg-emerald-500 rounded-l"
                          style={{
                            width: `${Math.max(5, (month.revenue / (Math.max(stats.totalRevenue, 1))) * 100)}%`,
                          }}
                        />
                        <div
                          className="bg-red-500 rounded-r"
                          style={{
                            width: `${Math.max(5, (month.expenses / (Math.max(stats.totalExpenses, 1))) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center gap-6 pt-4 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-emerald-500" />
                      <span className="text-muted-foreground">Revenue</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded bg-red-500" />
                      <span className="text-muted-foreground">Expenses</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Services */}
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <CardTitle className="text-lg">Top Services</CardTitle>
                <CardDescription>Most popular services by revenue</CardDescription>
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
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{service.name}</p>
                          <p className="text-sm text-muted-foreground">{service.count} bookings</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatCurrency(service.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10">
                    <Calendar className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.totalBookings}</p>
                    <p className="text-xs text-muted-foreground">Total Bookings</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10">
                    <Camera className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.completedBookings}</p>
                    <p className="text-xs text-muted-foreground">Completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-500/10">
                    <FileText className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.pendingInvoices}</p>
                    <p className="text-xs text-muted-foreground">Pending Invoices</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50 bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <FileText className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.paidInvoices}</p>
                    <p className="text-xs text-muted-foreground">Paid Invoices</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Revenue Details</CardTitle>
              <CardDescription>Detailed revenue breakdown and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Detailed revenue charts coming soon</p>
                <p className="text-sm text-muted-foreground/70">Advanced analytics will be available in a future update</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Booking Analytics</CardTitle>
              <CardDescription>Booking patterns and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Calendar className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Booking analytics coming soon</p>
                <p className="text-sm text-muted-foreground/70">Track booking trends, peak times, and more</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services">
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle>Service Performance</CardTitle>
              <CardDescription>Analyze service popularity and revenue</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Camera className="w-12 h-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Service analytics coming soon</p>
                <p className="text-sm text-muted-foreground/70">Compare service performance and optimize offerings</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
