import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { portfolioCategoryNameFromSlug } from '@/lib/portfolio-categories'

export async function GET() {
  try {
    const supabase = createAdminClient()

    const [galleryResult, categoryResult] = await Promise.all([
      supabase
        .from('gallery')
        .select('*')
        .eq('is_public', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('portfolio_categories')
        .select('id,name,slug,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
    ])

    if (galleryResult.error) throw galleryResult.error
    if (categoryResult.error) {
      console.warn('Public portfolio categories unavailable:', categoryResult.error.message)
    }

    const galleryItems = galleryResult.data || []
    const fallbackCategories = Array.from(
      new Set(galleryItems.map((item) => String(item.session_type || '')).filter(Boolean)),
    ).map((slug, index) => ({
      id: slug,
      name: portfolioCategoryNameFromSlug(slug),
      slug,
      sort_order: index,
    }))

    return NextResponse.json({
      success: true,
      data: galleryItems,
      categories: categoryResult.data || fallbackCategories,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to load gallery' },
      { status: 500 },
    )
  }
}
