import { NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/admin-auth'
import { createPortfolioCategorySlug } from '@/lib/portfolio-categories'

export async function GET() {
  try {
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const { data, error } = await context.supabase
      .from('portfolio_categories')
      .select('id,name,slug,description,cover_image_url,is_active,sort_order,created_at,updated_at')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })

    if (error) throw error

    return NextResponse.json(
      { success: true, data: data || [] },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (error) {
    console.error('Portfolio categories load error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load portfolio categories.',
      },
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
    const slug = createPortfolioCategorySlug(name)
    const requestedSortOrder = Number(body.sort_order)

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
      .from('portfolio_categories')
      .select('id,name,slug')
      .eq('slug', slug)
      .maybeSingle()

    if (existingError) throw existingError
    if (existing) {
      return NextResponse.json(
        { error: `A portfolio category named "${existing.name}" already exists.` },
        { status: 409 },
      )
    }

    let sortOrder = Number.isFinite(requestedSortOrder)
      ? Math.max(0, Math.min(Math.trunc(requestedSortOrder), 100000))
      : 0

    if (!Number.isFinite(requestedSortOrder)) {
      const { data: lastCategory, error: orderError } = await context.supabase
        .from('portfolio_categories')
        .select('sort_order')
        .order('sort_order', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (orderError) throw orderError
      sortOrder = Number(lastCategory?.sort_order || 0) + 1
    }

    const { data, error } = await context.supabase
      .from('portfolio_categories')
      .insert({
        name,
        slug,
        description: description || null,
        is_active: true,
        sort_order: sortOrder,
      })
      .select('id,name,slug,description,cover_image_url,is_active,sort_order,created_at,updated_at')
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'That portfolio category already exists.' }, { status: 409 })
      }
      throw error
    }

    await context.supabase.from('audit_logs').insert({
      user_id: context.user.id,
      action: 'create_portfolio_category',
      resource_type: 'portfolio_category',
      resource_id: data.id,
      new_data: data,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ success: true, data }, { status: 201 })
  } catch (error) {
    console.error('Portfolio category create error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create portfolio category.',
      },
      { status: 500 },
    )
  }
}
