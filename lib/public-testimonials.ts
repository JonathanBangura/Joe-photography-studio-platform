import 'server-only'
import type { PublicTestimonial } from '@/components/public/testimonials-section'
import { createAdminClient } from '@/lib/supabase/admin'

type TestimonialRow = {
  id: string
  client_name: string
  content: string
  rating: number | null
  session_type: string | null
  photo_url?: string | null
}

export async function getPublicTestimonials(): Promise<PublicTestimonial[]> {
  try {
    const supabase = createAdminClient()
    let { data, error } = await supabase
      .from('testimonials')
      .select('id, client_name, content, rating, session_type, photo_url, is_featured, created_at')
      .eq('is_approved', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (error && /photo_url/i.test(error.message)) {
      const fallback = await supabase
        .from('testimonials')
        .select('id, client_name, content, rating, session_type, is_featured, created_at')
        .eq('is_approved', true)
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
      data = fallback.data as typeof data
      error = fallback.error
    }

    if (error) {
      console.error('Public testimonials fetch error:', error)
      return []
    }

    return ((data || []) as TestimonialRow[]).map((item) => ({
      id: item.id,
      name: item.client_name,
      role: item.session_type ? `${item.session_type} Client` : 'Client',
      content: item.content,
      rating: Number(item.rating || 5),
      image: item.photo_url || null,
    }))
  } catch (error) {
    console.error('Public testimonials error:', error)
    return []
  }
}
