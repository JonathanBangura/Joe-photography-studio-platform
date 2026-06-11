import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicBusinessSettings } from '@/lib/business-settings-public'

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

    const body = await request.json()
    const settings = body.settings || body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { error: 'Settings payload is required' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()
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
