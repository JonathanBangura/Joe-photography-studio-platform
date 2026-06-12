import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('gallery')
      .select('*')
      .eq('is_public', true)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(8)

    if (error) throw error

    return NextResponse.json({ success: true, data: data || [] })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load gallery' },
      { status: 500 },
    )
  }
}
