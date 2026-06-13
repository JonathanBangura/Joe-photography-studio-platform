import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { defaultPublicBusinessSettings } from '@/lib/business-settings-public'

function settingCategory(key: string) {
  if (
    key.includes('hero') ||
    key.includes('about') ||
    key.includes('cta') ||
    key.includes('clients_count') ||
    key.includes('years_experience') ||
    key.includes('photos_delivered') ||
    key.includes('awards_count')
  ) {
    return 'website_content'
  }

  if (
    key.includes('social') ||
    key === 'website' ||
    key === 'working_hours'
  ) {
    return 'website'
  }

  return 'general'
}

export async function GET() {
  try {
    const authSupabase = await createClient()
    const {
      data: { user },
    } = await authSupabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('business_settings')
      .select('key, value')

    if (error) throw error

    const settings: Record<string, unknown> = { ...defaultPublicBusinessSettings }

    data?.forEach((item) => {
      settings[item.key] = item.value
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Website content load error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load website content' },
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
      return NextResponse.json({ error: 'Settings payload is required' }, { status: 400 })
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

    if (error) throw error

    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action: 'update_website_content',
      resource_type: 'business_settings',
      resource_id: null,
      new_data: settings,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ settings })
  } catch (error) {
    console.error('Website content save error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to save website content' },
      { status: 500 },
    )
  }
}
