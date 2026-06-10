import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    const name = String(body.name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const message = String(body.message || '').trim()

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email and message are required.' },
        { status: 400 },
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('contact_submissions')
      .insert({
        name,
        email,
        phone: body.phone ? String(body.phone).trim() : null,
        subject: body.subject ? String(body.subject).trim() : null,
        message,
        session_type: body.session_type || null,
        preferred_date: body.preferred_date || null,
        is_read: false,
        is_responded: false,
      })
      .select('*')
      .single()

    if (error) {
      console.error('Contact insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    await supabase.from('audit_logs').insert({
      action: 'contact_submission_created',
      resource_type: 'contact_submission',
      resource_id: data.id,
      new_data: data,
      ip_address: request.headers.get('x-forwarded-for'),
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({ submission: data })
  } catch (error) {
    console.error('Contact API error:', error)
    return NextResponse.json(
      { error: 'Unable to submit inquiry.' },
      { status: 500 },
    )
  }
}
