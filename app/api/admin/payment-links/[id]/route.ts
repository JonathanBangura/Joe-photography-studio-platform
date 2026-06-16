import { randomBytes } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/admin-auth'

type Params = {
  params: Promise<{ id: string }>
}

function buildPaymentUrl(request: NextRequest, token: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  return `${appUrl.replace(/\/$/, '')}/pay/${token}`
}

function generateToken() {
  return randomBytes(18).toString('base64url').toUpperCase()
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const context = await requireAdminContext()
    if ("error" in context) return context.error

    const { id } = await params
    const body = await request.json()
    const supabase = context.supabase

    const { data: oldData } = await supabase
      .from('customer_payment_links')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!oldData) {
      return NextResponse.json({ error: 'Payment link not found' }, { status: 404 })
    }

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if ('expires_at' in body) {
      payload.expires_at = body.expires_at ? new Date(body.expires_at).toISOString() : null
    }

    if ('status' in body) {
      const status = String(body.status || '').toLowerCase()
      if (!['active', 'disabled', 'expired'].includes(status)) {
        return NextResponse.json({ error: 'Invalid payment link status' }, { status: 400 })
      }
      payload.status = status
    }

    if (body.regenerate) {
      payload.token = generateToken()
      payload.status = 'active'
    }

    const { data, error } = await supabase
      .from('customer_payment_links')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    await supabase.from('audit_logs').insert({
      user_id: context.user.id,
      action: body.regenerate ? 'regenerate_payment_link' : 'update_payment_link',
      resource_type: 'payment_link',
      resource_id: id,
      old_data: oldData,
      new_data: data,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      success: true,
      data: {
        ...data,
        payment_url: buildPaymentUrl(request, data.token),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update payment link' },
      { status: 500 },
    )
  }
}
