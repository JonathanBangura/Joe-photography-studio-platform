import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('services')
      .select('id,name,description,session_type,base_price,base_price_sle,duration_minutes,includes,pricing_type,unit_label,minimum_quantity,maximum_quantity,quantity_step,is_active,created_at,updated_at')
      .eq('is_active', true)
      .order('base_price', { ascending: false })

    if (error) throw error

    return NextResponse.json({ services: data || [] })
  } catch (error) {
    console.error('Public services load error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to load services' },
      { status: 500 },
    )
  }
}
