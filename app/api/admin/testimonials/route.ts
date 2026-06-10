import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('testimonials')
      .select('*, client:clients(full_name, email, phone, profile:profiles(full_name, email))')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ testimonials: data || [] })
  } catch (error) {
    console.error('Admin testimonials fetch error:', error)
    return NextResponse.json(
      { error: 'Unable to load testimonials.' },
      { status: 500 },
    )
  }
}
