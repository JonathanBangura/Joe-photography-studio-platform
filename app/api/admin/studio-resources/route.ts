import { NextResponse } from 'next/server'
import { requireAdminContext } from '@/lib/admin-auth'

export async function GET() {
  try {
    const context = await requireAdminContext()
    if ('error' in context) return context.error

    const { data, error } = await context.supabase
      .from('studio_resources')
      .select('*')
      .eq('is_active', true)
      .order('type')
      .order('name')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ resources: data || [] })
  } catch (error) {
    console.error('Admin studio resources fetch error:', error)
    return NextResponse.json(
      { error: 'Unable to load studio resources.' },
      { status: 500 },
    )
  }
}
