import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type Params = {
  params: Promise<{ id: string }>
}

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

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    const { data: oldData } = await supabase
      .from('gallery')
      .select('*')
      .eq('id', id)
      .single()

    const payload: Record<string, unknown> = {}

    if ('title' in body) payload.title = String(body.title || '').trim()
    if ('description' in body) payload.description = body.description ? String(body.description).trim() : null
    if ('image_url' in body) payload.image_url = String(body.image_url || '').trim()
    if ('session_type' in body) payload.session_type = normalizeSessionType(body.session_type)
    if ('is_featured' in body) payload.is_featured = Boolean(body.is_featured)
    if ('is_public' in body) payload.is_public = Boolean(body.is_public)
    if ('display_order' in body) payload.display_order = Number(body.display_order || 0)

    const { data, error } = await supabase
      .from('gallery')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    await supabase.from('audit_logs').insert({
      action: 'update_portfolio_gallery_item',
      resource_type: 'gallery',
      resource_id: id,
      old_data: oldData || null,
      new_data: data,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ success: true, data })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update portfolio item' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const supabase = createAdminClient()

    const { data: oldData } = await supabase
      .from('gallery')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('gallery')
      .delete()
      .eq('id', id)

    if (error) throw error

    await supabase.from('audit_logs').insert({
      action: 'delete_portfolio_gallery_item',
      resource_type: 'gallery',
      resource_id: id,
      old_data: oldData || null,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete portfolio item' },
      { status: 500 },
    )
  }
}
