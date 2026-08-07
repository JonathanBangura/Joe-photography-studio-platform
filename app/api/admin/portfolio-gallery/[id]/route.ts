import { NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/admin-auth'
import { GALLERY_IMAGES_BUCKET, getStoragePathFromPublicUrl } from '@/lib/storage'

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

function isValidImageUrl(value: string) {
  try {
    const url = new URL(value)
    return (url.protocol === 'https:' || url.protocol === 'http:') && value.length <= 2048
  } catch {
    return false
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const { id } = await params
    const body = await request.json()

    const { data: oldData } = await context.supabase
      .from('gallery')
      .select('*')
      .eq('id', id)
      .single()

    const payload: Record<string, unknown> = {}

    if ('title' in body) {
      const title = String(body.title || '').trim()
      if (!title) return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
      payload.title = title
    }
    if ('description' in body) payload.description = body.description ? String(body.description).trim() : null
    if ('image_url' in body) {
      const imageUrl = String(body.image_url || '').trim()
      if (!isValidImageUrl(imageUrl)) {
        return NextResponse.json({ error: 'Image URL must be a valid HTTP or HTTPS URL.' }, { status: 400 })
      }
      payload.image_url = imageUrl
    }
    if ('session_type' in body) payload.session_type = normalizeSessionType(body.session_type)
    if ('is_featured' in body) payload.is_featured = Boolean(body.is_featured)
    if ('is_public' in body) payload.is_public = Boolean(body.is_public)
    if ('display_order' in body) payload.display_order = Number(body.display_order || 0)

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'No portfolio fields were provided.' }, { status: 400 })
    }

    const { data, error } = await context.supabase
      .from('gallery')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error

    if (oldData?.image_url && data.image_url !== oldData.image_url) {
      const oldStoragePath = getStoragePathFromPublicUrl(oldData.image_url)
      if (oldStoragePath) {
        const { error: storageError } = await context.supabase.storage
          .from(GALLERY_IMAGES_BUCKET)
          .remove([oldStoragePath])

        if (storageError) console.warn('Portfolio image cleanup warning:', storageError.message)
      }
    }

    await context.supabase.from('audit_logs').insert({
      user_id: context.user.id,
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
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const { id } = await params

    const { data: oldData } = await context.supabase
      .from('gallery')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await context.supabase
      .from('gallery')
      .delete()
      .eq('id', id)

    if (error) throw error

    const storagePath = oldData?.image_url ? getStoragePathFromPublicUrl(oldData.image_url) : null
    if (storagePath) {
      const { error: storageError } = await context.supabase.storage
        .from(GALLERY_IMAGES_BUCKET)
        .remove([storagePath])

      if (storageError) console.warn('Portfolio image delete warning:', storageError.message)
    }

    await context.supabase.from('audit_logs').insert({
      user_id: context.user.id,
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
