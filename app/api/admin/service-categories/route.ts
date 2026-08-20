import { NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/admin-auth'
import { createServiceCategorySlug } from '@/lib/service-categories'

const CATEGORY_SELECT = 'id,name,slug,description,is_active,sort_order,created_at,updated_at'

function databaseSetupMessage(error: { code?: string; message?: string }) {
  if (error.code === '42P01' || error.message?.includes('service_categories')) {
    return 'Run supabase/service-categories-setup.sql in the Supabase SQL Editor, then refresh this page.'
  }
  if (error.code === '42501') {
    return 'The service categories table is not available to the server. Run supabase/service-categories-setup.sql again to apply its grants.'
  }
  return error.message || 'Service category request failed.'
}

export async function GET() {
  try {
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const { data, error } = await context.supabase
      .from('service_categories')
      .select(CATEGORY_SELECT)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: databaseSetupMessage(error) }, { status: 409 })
    }

    return NextResponse.json(
      { success: true, data: data || [] },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Service categories load error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load service categories.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const body = await request.json()
    const name = String(body.name || '').trim().replace(/\s+/g, ' ')
    const description = String(body.description || '').trim()
    const slug = createServiceCategorySlug(name)

    if (!name) {
      return NextResponse.json({ error: 'Category name is required.' }, { status: 400 })
    }
    if (name.length > 80) {
      return NextResponse.json({ error: 'Category name must be 80 characters or fewer.' }, { status: 400 })
    }
    if (!slug) {
      return NextResponse.json({ error: 'Enter a category name containing letters or numbers.' }, { status: 400 })
    }
    if (description.length > 500) {
      return NextResponse.json({ error: 'Category description must be 500 characters or fewer.' }, { status: 400 })
    }

    const { data: existing, error: existingError } = await context.supabase
      .from('service_categories')
      .select('id,name,slug')
      .eq('slug', slug)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: databaseSetupMessage(existingError) }, { status: 409 })
    }
    if (existing) {
      return NextResponse.json(
        { error: `A service category named "${existing.name}" already exists.` },
        { status: 409 },
      )
    }

    const { data: lastCategory, error: orderError } = await context.supabase
      .from('service_categories')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (orderError) {
      return NextResponse.json({ error: databaseSetupMessage(orderError) }, { status: 409 })
    }

    const { data, error } = await context.supabase
      .from('service_categories')
      .insert({
        name,
        slug,
        description: description || null,
        is_active: true,
        sort_order: Number(lastCategory?.sort_order || 0) + 1,
      })
      .select(CATEGORY_SELECT)
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'That service category already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: databaseSetupMessage(error) }, { status: 409 })
    }

    await context.supabase.from('audit_logs').insert({
      user_id: context.user.id,
      action: 'create_service_category',
      resource_type: 'service_category',
      resource_id: data.id,
      new_data: data,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Service category create error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create service category.' },
      { status: 500 },
    )
  }
}

