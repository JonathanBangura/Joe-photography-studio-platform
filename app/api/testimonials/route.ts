import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('testimonials')
      .select('id, client_name, content, rating, session_type, is_featured, created_at')
      .eq('is_approved', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ testimonials: data || [] })
  } catch (error) {
    console.error('Testimonials API error:', error)
    return NextResponse.json(
      { error: 'Unable to load testimonials.' },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const clientName = String(body.client_name || body.name || '').trim()
    const content = String(body.content || body.message || '').trim()
    const rating = Number(body.rating || 5)

    if (!clientName || !content) {
      return NextResponse.json(
        { error: 'Client name and testimonial content are required.' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('testimonials')
      .insert({
        client_name: clientName,
        content,
        rating: Math.min(Math.max(rating, 1), 5),
        session_type: body.session_type || null,
        is_approved: false,
        is_featured: false,
      })
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await supabase.from('audit_logs').insert({
      action: 'testimonial_submitted',
      resource_type: 'testimonial',
      resource_id: data.id,
      new_data: data,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ testimonial: data })
  } catch (error) {
    console.error('Testimonial submit error:', error)
    return NextResponse.json(
      { error: 'Unable to submit testimonial.' },
      { status: 500 },
    )
  }
}
