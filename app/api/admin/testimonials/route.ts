import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdminContext } from '@/lib/admin-auth'

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

      return NextResponse.json({ testimonials: fallbackData || [] })
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
