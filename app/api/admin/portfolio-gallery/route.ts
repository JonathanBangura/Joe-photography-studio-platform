import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const allowedSessionTypes = new Set([
  'wedding',
  'portrait',
  'event',
  'corporate',
  'product',
  'family',
  'maternity',
  'newborn',
])

function normalizeSessionType(value: unknown) {
  const sessionType = String(value || '').trim().toLowerCase()
  return allowedSessionTypes.has(sessionType) ? sessionType : null
}

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load portfolio gallery' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const supabase = createAdminClient()

    const title = String(body.title || '').trim()
    const imageUrl = String(body.image_url || '').trim()

    if (!title || !imageUrl) {
      return NextResponse.json({ error: 'Title and image URL are required.' }, { status: 400 })
    }

    const payload = {
      title,
      description: body.description ? String(body.description).trim() : null,
      image_url: imageUrl,
      session_type: normalizeSessionType(body.session_type),
      is_featured: Boolean(body.is_featured),
      is_public: body.is_public !== false,
      display_order: Number(body.display_order || 0),
    }

    const { data, error } = await supabase
      .from('gallery')
      .insert(payload)
      .select('*')
      .single()

    if (error) throw error

    await supabase.from('audit_logs').insert({
      action: 'create_portfolio_gallery_item',
      resource_type: 'gallery',
      resource_id: data.id,
      new_data: data,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create portfolio item' },
      { status: 500 },
    )
  }
}
