import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { formatSle, formatUsd } from '@/lib/currency'

type StatCard = {
  title: string
  value: string | number
  secondaryValue?: string
  icon: LucideIcon
  change: string
  changeType: 'positive' | 'warning' | 'negative'
  href: string
}

function toUsd(sle: number, exchangeRate = 24) {
  return Number((Number(sle || 0) / exchangeRate).toFixed(2))
}

function getBookingClientName(booking: any) {
  return (
    booking.client?.full_name ||
    booking.client?.profile?.full_name ||
    booking.client?.email ||
    booking.client?.profile?.email ||
    'Unknown Client'
  )
}

async function getDashboardStats() {
  const supabase = await createClient()
  
  const today = new Date().toISOString().split('T')[0]
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  
  // Get bookings count
  const { count: totalBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
  
  // Get pending bookings
  const { count: pendingBookings } = await supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')

  // Get today's bookings
  const { data: todayBookings } = await supabase
    .from('bookings')
    .select('*, service:services(*), client:clients(*, profile:profiles(*))')
    .eq('booking_date', today)
    .order('start_time')

  // Get total clients
  const { count: totalClients } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })

  // Payment amounts are stored in SLE. Use the payment ledger for collected monthly revenue.
  const { data: monthPayments } = await supabase
    .from('payments')
    .select('amount, payment_date, created_at')
    .gte('created_at', startOfMonth)

  const monthRevenue = monthPayments?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0

  // Get unread messages
  const { count: unreadMessages } = await supabase
    .from('contact_submissions')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  // Get recent bookings
  const { data: recentBookings } = await supabase
    .from('bookings')
    .select('*, service:services(*), client:clients(*, profile:profiles(*))')
    .order('created_at', { ascending: false })
    .limit(5)

  return {
    totalBookings: totalBookings || 0,
    pendingBookings: pendingBookings || 0,
    todayBookings: todayBookings || [],
    totalClients: totalClients || 0,
    monthRevenue,
    unreadMessages: unreadMessages || 0,
    recentBookings: recentBookings || [],
  }
}

export default async function AdminDashboard() {
  const stats = await getDashboardStats()

  const statCards: StatCard[] = [
    {
      title: 'Total Bookings',
      value: stats.totalBookings,
      icon: Calendar,
      change: '+12%',
      changeType: 'positive' as const,
      href: '/admin/bookings',
    },
    {
      title: 'Total Clients',
      value: stats.totalClients,
      icon: Users,
      change: '+8%',
      changeType: 'positive' as const,
      href: '/admin/clients',
    },
    {
      title: 'Monthly Revenue',
      value: formatSle(stats.monthRevenue),
      secondaryValue: formatUsd(toUsd(stats.monthRevenue)),
      icon: DollarSign,
      change: '+23%',
      changeType: 'positive' as const,
      href: '/admin/finance',
    },
    {
      title: 'Pending Bookings',
      value: stats.pendingBookings,
      icon: Clock,
      change: stats.pendingBookings > 0 ? 'Needs attention' : 'All clear',
      changeType: stats.pendingBookings > 0 ? 'warning' as const : 'positive' as const,
      href: '/admin/bookings?status=pending',
    },
  ]

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back! Here&apos;s an overview of your studio.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className={`flex items-center gap-1 text-xs font-medium ${
                    stat.changeType === 'positive' ? 'text-green-500' : 
                    stat.changeType === 'warning' ? 'text-amber-500' : 'text-red-500'
                  }`}>
                    {stat.changeType === 'positive' ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : stat.changeType === 'negative' ? (
                      <ArrowDownRight className="w-3 h-3" />
                    ) : (
                      <AlertCircle className="w-3 h-3" />
                    )}
                    {stat.change}
                  </div>
                </div>
                <p className="text-2xl font-bold mt-4">{stat.value}</p>
                {'secondaryValue' in stat && stat.secondaryValue && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.secondaryValue}</p>
                )}
                <p className="text-sm text-muted-foreground mt-1">{stat.title}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Today's Schedule & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Today&apos;s Schedule</CardTitle>
            <Link href="/admin/bookings" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {stats.todayBookings.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No bookings scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.todayBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {getBookingClientName(booking)}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        {booking.service?.name || 'Service'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {booking.start_time?.slice(0, 5)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.location || 'Studio'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-semibold">Recent Bookings</CardTitle>
            <Link href="/admin/bookings" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentBookings.length === 0 ? (
              <div className="text-center py-8">
                <TrendingUp className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No recent bookings</p>
              </div>
            ) : (
              <div className="space-y-4">
                {stats.recentBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-4"
                  >
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      booking.status === 'confirmed' ? 'bg-green-500' :
                      booking.status === 'pending' ? 'bg-amber-500' :
                      booking.status === 'completed' ? 'bg-blue-500' :
                      'bg-muted-foreground'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {getBookingClientName(booking)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {booking.service?.name} - {new Date(booking.booking_date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                      booking.status === 'confirmed' ? 'bg-green-500/10 text-green-500' :
                      booking.status === 'pending' ? 'bg-amber-500/10 text-amber-500' :
                      booking.status === 'completed' ? 'bg-blue-500/10 text-blue-500' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {booking.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Link
              href="/admin/bookings"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">New Booking</span>
            </Link>
            <Link
              href="/admin/clients"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Add Client</span>
            </Link>
            <Link
              href="/admin/invoices"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Create Invoice</span>
            </Link>
            <Link
              href="/admin/inquiries"
              className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-center relative"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">View Messages</span>
              {stats.unreadMessages > 0 && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {stats.unreadMessages}
                </span>
              )}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
