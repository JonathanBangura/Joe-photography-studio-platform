import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

type SupabaseAdmin = ReturnType<typeof createAdminClient>

export type PortalProfile = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role: string | null
  studio_role: string | null
}

export type PortalClient = {
  id: string
  profile_id: string | null
  full_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  preferred_contact: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

export type PortalSession = {
  user: User
  profile: PortalProfile | null
  client: PortalClient | null
  supabase: SupabaseAdmin
}

export type PaymentSummary = {
  totalUsd: number
  totalSle: number
  exchangeRate: number
  paidSle: number
  balanceSle: number
  tipsSle: number
  status: string
}

function money(value: unknown) {
  return Number(Number(value || 0).toFixed(2))
}

function getEmail(user: User, profile?: PortalProfile | null) {
  return String(profile?.email || user.email || '').trim().toLowerCase()
}

function getName(user: User, profile?: PortalProfile | null) {
  const metadataName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : ''
  return String(profile?.full_name || metadataName || user.email || 'Client').trim()
}

export async function getPortalSession(): Promise<PortalSession> {
  const authClient = await createClient()
  const {
    data: { user },
  } = await authClient.auth.getUser()

  if (!user) redirect('/auth/login')

  const supabase = createAdminClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role === 'admin' || profile?.role === 'staff' || profile?.studio_role === 'super_admin') {
    redirect('/admin')
  }

  let client: PortalClient | null = null

  const { data: profileClient } = await supabase
    .from('clients')
    .select('*')
    .eq('profile_id', user.id)
    .maybeSingle()

  client = profileClient as PortalClient | null

  const email = getEmail(user, profile as PortalProfile | null)

  if (!client && email) {
    const { data: emailClient } = await supabase
      .from('clients')
      .select('*')
      .ilike('email', email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    client = emailClient as PortalClient | null

    if (client && !client.profile_id) {
      const { data: linkedClient } = await supabase
        .from('clients')
        .update({ profile_id: user.id, updated_at: new Date().toISOString() })
        .eq('id', client.id)
        .select('*')
        .single()

      if (linkedClient) client = linkedClient as PortalClient
    }
  }

  if (!client) {
    const { data: createdClient } = await supabase
      .from('clients')
      .insert({
        profile_id: user.id,
        full_name: getName(user, profile as PortalProfile | null),
        email: email || null,
        phone: profile?.phone || null,
        preferred_contact: email ? 'email' : 'phone',
      })
      .select('*')
      .single()

    client = (createdClient || null) as PortalClient | null
  }

  return {
    user,
    profile: (profile || null) as PortalProfile | null,
    client,
    supabase,
  }
}

export async function getPortalBookings(clientId: string, supabase: SupabaseAdmin) {
  const { data, error } = await supabase
    .from('bookings')
    .select('*, service:services(*), resource:studio_resources(*), invoice:invoices(*)')
    .eq('client_id', clientId)
    .order('booking_date', { ascending: false })
    .order('start_time', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPortalInvoices(clientId: string, supabase: SupabaseAdmin) {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, booking:bookings(*, service:services(*)), payments(*), payment_links:customer_payment_links(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPortalPaymentLinks(clientId: string, supabase: SupabaseAdmin) {
  const { data, error } = await supabase
    .from('customer_payment_links')
    .select('*, invoice:invoices(*), booking:bookings(*, service:services(*)), payment_orders(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPortalPayments(invoiceIds: string[], supabase: SupabaseAdmin) {
  if (!invoiceIds.length) return []

  const { data, error } = await supabase
    .from('payments')
    .select('*, invoice:invoices(*, booking:bookings(*, service:services(*)))')
    .in('invoice_id', invoiceIds)
    .order('payment_date', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPortalGalleries(clientId: string, supabase: SupabaseAdmin) {
  const { data, error } = await supabase
    .from('client_galleries')
    .select('*, booking:bookings(*, service:services(*)), photos:client_gallery_photos(*)')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export function isExpired(expiresAt?: string | null) {
  if (!expiresAt) return false
  return new Date(expiresAt).getTime() < Date.now()
}

export function getInvoicePaymentSummary(invoice: any, payments?: any[]): PaymentSummary {
  const exchangeRate = money(invoice?.exchange_rate || invoice?.booking?.exchange_rate || 24)
  const totalUsd = money(invoice?.total_amount || 0)
  const totalSle = money(invoice?.total_amount_sle || totalUsd * exchangeRate)
  const completedPayments = (payments || invoice?.payments || []).filter((payment: any) => payment.payment_status !== 'failed')

  const paidSle = money(
    completedPayments.reduce((sum: number, payment: any) => {
      const applied = payment.applied_amount === null || payment.applied_amount === undefined
        ? payment.amount
        : payment.applied_amount
      return sum + Number(applied || 0)
    }, 0),
  )

  const tipsSle = money(completedPayments.reduce((sum: number, payment: any) => sum + Number(payment.tip_amount || 0), 0))
  const balanceSle = money(Math.max(totalSle - paidSle, 0))

  const status = balanceSle <= 0
    ? 'paid'
    : paidSle > 0
      ? 'partial'
      : invoice?.payment_status || 'pending'

  return { totalUsd, totalSle, exchangeRate, paidSle, balanceSle, tipsSle, status }
}

export function getPaymentUrl(link?: { token?: string | null } | null) {
  if (!link?.token) return null
  return `/pay/${link.token}`
}

export function getPrimaryPaymentLink(links?: any[] | null) {
  const list = Array.isArray(links) ? links : []
  return list.find((link) => link.status === 'active' && !isExpired(link.expires_at)) || list[0] || null
}

export function formatDate(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Not set'
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
