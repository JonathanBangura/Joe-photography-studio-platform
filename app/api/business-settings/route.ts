import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicBusinessSettings } from '@/lib/business-settings-public'
import { isBackOfficeStudioRole } from '@/lib/permissions'

function settingCategory(key: string) {
  if (
    key.includes('social') ||
    key === 'website' ||
    key.includes('hero') ||
    key.includes('about') ||
    key.includes('footer')
  ) {
    return 'website'
  }

  if (
    key.includes('invoice') ||
    key.includes('currency') ||
    key.includes('exchange_rate') ||
    key.includes('usd_to_sle') ||
    key.includes('price_display') ||
    key.includes('tax') ||
    key.includes('deposit')
  ) {
    return 'billing'
  }

  if (
    key.includes('booking') ||
    key.includes('cancellation') ||
    key.includes('timezone')
  ) {
    return 'booking'
  }

  if (key.includes('notification') || key.includes('reminder') || key.includes('sms')) {
    return 'notifications'
  }

  return 'general'
}

export async function GET() {
  try {
    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (user) {
      const supabase = createAdminClient()
      const { data: profile } = await supabase
        .from('profiles')
        .select('studio_role, is_active')
        .eq('id', user.id)
        .maybeSingle()

      if (profile?.is_active !== false && isBackOfficeStudioRole(profile?.studio_role)) {
        const { data, error } = await supabase
          .from('business_settings')
          .select('key, value')

        if (error) throw error

        const settings = Object.fromEntries(
          (data || []).map((item) => [item.key, item.value]),
        )

        return NextResponse.json({ settings })
      }
    }

    const settings = await getPublicBusinessSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Business settings API error:', error)
    return NextResponse.json(
      { error: 'Unable to load business settings' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const authSupabase = await createClient()

    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()
    const { data: profile } = await supabase
      .from('profiles')
      .select('studio_role, is_active')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.is_active === false || !isBackOfficeStudioRole(profile?.studio_role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const settings = body.settings || body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings payload is required' },
        { status: 400 },
      )
    }

    const now = new Date().toISOString()

    const rows = Object.entries(settings).map(([key, value]) => ({
      key,
      value,
      category: settingCategory(key),
      updated_at: now,
    }))

    const { error } = await supabase
      .from('business_settings')
      .upsert(rows, { onConflict: 'key' })

    if (error) {
      throw error
    }

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'update_business_settings',
      resource_type: 'business_settings',
      resource_id: null,
      new_data: settings,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Business settings save error:', error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to save business settings',
      },
      { status: 500 },
    )
  }
}
