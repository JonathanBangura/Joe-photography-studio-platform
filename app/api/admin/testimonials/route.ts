import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminContext } from '@/lib/admin-auth'

const starterTestimonials = [
  {
    client_name: 'Sarah & Michael Johnson',
    content:
      'Joe Studio captured our wedding day perfectly. Every emotion, every detail, every precious moment was preserved in the most beautiful way.',
    rating: 5,
    session_type: null,
    is_approved: true,
    is_featured: true,
  },
  {
    client_name: 'David Chen',
    content:
      'The team at Joe Studio transformed our corporate headshots from mundane to magnificent. Their attention to lighting and composition made our entire leadership team look polished and professional.',
    rating: 5,
    session_type: null,
    is_approved: true,
    is_featured: false,
  },
  {
    client_name: 'Emily Rodriguez',
    content:
      'I have never felt so comfortable in front of a camera. The portrait session was fun, relaxed, and the results exceeded all my expectations.',
    rating: 5,
    session_type: null,
    is_approved: true,
    is_featured: false,
  },
]

function normalizeTestimonial(row: any) {
  const clientName =
    row.client_name ||
    row.client?.full_name ||
    row.client?.profile?.full_name ||
    row.client?.email ||
    row.client?.profile?.email ||
    'Unknown Client'

  return {
    ...row,
    client_name: clientName,
    rating: Math.min(Math.max(Number(row.rating || 5), 1), 5),
    is_approved: Boolean(row.is_approved),
    is_featured: Boolean(row.is_featured),
  }
}

export async function GET() {
  try {
    const context = await requireAdminContext()
    if ("error" in context) return context.error

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('testimonials')
      .select('*, client:clients(full_name, email, phone, profile:profiles(full_name, email))')
      .order('created_at', { ascending: false })

    if (error) {
      console.warn('Testimonials joined fetch failed, falling back to plain query:', error.message)
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('testimonials')
        .select('*')
        .order('created_at', { ascending: false })

      if (fallbackError) {
        return NextResponse.json({ error: fallbackError.message }, { status: 400 })
      }

      return NextResponse.json({ testimonials: (fallbackData || []).map(normalizeTestimonial) })
    }

    return NextResponse.json({ testimonials: (data || []).map(normalizeTestimonial) })
  } catch (error) {
    console.error('Admin testimonials fetch error:', error)
    return NextResponse.json(
      { error: 'Unable to load testimonials.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const context = await requireAdminContext()
    if ("error" in context) return context.error

    const body = await request.json()
    const supabase = createAdminClient()

    if (body.seed_starter === true) {
      const { data, error } = await supabase
        .from('testimonials')
        .insert(starterTestimonials)
        .select('*')

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }

      await supabase.from('audit_logs').insert({
        user_id: context.user.id,
        action: 'starter_testimonials_seeded',
        resource_type: 'testimonial',
        new_data: data,
        ip_address: request.headers.get('x-forwarded-for'),
        user_agent: request.headers.get('user-agent'),
      })

      return NextResponse.json({ testimonials: (data || []).map(normalizeTestimonial) })
    }

    const clientName = String(body.client_name || body.name || '').trim()
    const content = String(body.content || '').trim()
    const rating = Math.min(Math.max(Number(body.rating || 5), 1), 5)

    if (!clientName || !content) {
      return NextResponse.json(
        { error: 'Client name and testimonial content are required.' },
        { status: 400 },
      )
    }

    const { data, error } = await supabase
      .from('testimonials')
      .insert({
        client_name: clientName,
        content,
        rating,
        session_type: body.session_type || null,
        is_approved: Boolean(body.is_approved ?? true),
        is_featured: Boolean(body.is_featured ?? false),
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await supabase.from('audit_logs').insert({
      user_id: context.user.id,
      action: 'testimonial_created',
      resource_type: 'testimonial',
      resource_id: data.id,
      new_data: data,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ testimonial: normalizeTestimonial(data) })
  } catch (error) {
    console.error('Admin testimonial create error:', error)
    return NextResponse.json(
      { error: 'Unable to create testimonial.' },
      { status: 500 },
    )
  }
}
