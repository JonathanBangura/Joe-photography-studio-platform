import { NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/admin-auth'

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const body = await request.json()
    const context = await requireAdminContext()
    if ("error" in context) return context.error
    const supabase = context.supabase

    const { data: oldTestimonial } = await supabase
      .from('testimonials')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!oldTestimonial) {
      return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 })
    }

    const payload: Record<string, unknown> = {}

    if (typeof body.content === 'string') payload.content = body.content.trim()
    if (typeof body.client_name === 'string') payload.client_name = body.client_name.trim()
    if (body.rating !== undefined) payload.rating = Math.min(Math.max(Number(body.rating), 1), 5)
    if (body.session_type !== undefined) payload.session_type = body.session_type || null
    if (typeof body.is_approved === 'boolean') payload.is_approved = body.is_approved
    if (typeof body.is_featured === 'boolean') payload.is_featured = body.is_featured

    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ error: 'No valid update supplied' }, { status: 400 })
    }

    if (payload.is_featured === true) {
      payload.is_approved = true
    }

    const { data, error } = await supabase
      .from('testimonials')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await supabase.from('audit_logs').insert({
      action: 'testimonial_updated',
      resource_type: 'testimonial',
      resource_id: id,
      old_data: oldTestimonial,
      new_data: data,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ testimonial: data })
  } catch (error) {
    console.error('Admin testimonial update error:', error)
    return NextResponse.json(
      { error: 'Unable to update testimonial.' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const context = await requireAdminContext()
    if ("error" in context) return context.error
    const supabase = context.supabase

    const { data: oldTestimonial } = await supabase
      .from('testimonials')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (!oldTestimonial) {
      return NextResponse.json({ error: 'Testimonial not found' }, { status: 404 })
    }

    const { error } = await supabase
      .from('testimonials')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await supabase.from('audit_logs').insert({
      action: 'testimonial_deleted',
      resource_type: 'testimonial',
      resource_id: id,
      old_data: oldTestimonial,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin testimonial delete error:', error)
    return NextResponse.json(
      { error: 'Unable to delete testimonial.' },
      { status: 500 },
    )
  }
}
