import { NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/admin-auth'
import { MAX_PORTFOLIO_UPLOAD_FILES } from '@/lib/storage'

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

function isValidImageUrl(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && value.length <= 2048
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const { data, error } = await context.supabase
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
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const body = await request.json()

    const title = String(body.title || '').trim()
    const rawImageUrls = Array.isArray(body.image_urls) ? body.image_urls : [body.image_url]
    const imageUrls = Array.from(
      new Set<string>(rawImageUrls.map((value: unknown) => String(value || '').trim()).filter(Boolean)),
    )

    if (!title || imageUrls.length === 0) {
      return NextResponse.json({ error: 'Title and at least one image are required.' }, { status: 400 })
    }
    if (imageUrls.length > MAX_PORTFOLIO_UPLOAD_FILES) {
      return NextResponse.json(
        { error: `You can add up to ${MAX_PORTFOLIO_UPLOAD_FILES} images at once.` },
        { status: 400 },
      )
    }
    if (imageUrls.some((imageUrl) => !isValidImageUrl(imageUrl))) {
      return NextResponse.json({ error: 'Every image URL must be a valid HTTP or HTTPS URL.' }, { status: 400 })
    }

    const baseDisplayOrder = Number(body.display_order || 0)
    const payload = imageUrls.map((imageUrl, index) => ({
      title,
      description: body.description ? String(body.description).trim() : null,
      image_url: imageUrl,
      session_type: normalizeSessionType(body.session_type),
      is_featured: Boolean(body.is_featured),
      is_public: body.is_public !== false,
      display_order: (Number.isFinite(baseDisplayOrder) ? baseDisplayOrder : 0) + index,
    }))

    const { data, error } = await context.supabase
      .from('gallery')
      .insert(payload)
      .select('*')

    if (error) throw error

    await context.supabase.from('audit_logs').insert({
      user_id: context.user.id,
      action: 'create_portfolio_gallery_item',
      resource_type: 'gallery',
      resource_id: data?.[0]?.id || null,
      new_data: { count: data?.length || 0, items: data || [] },
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create portfolio item' },
      { status: 500 },
    )
  }
}
