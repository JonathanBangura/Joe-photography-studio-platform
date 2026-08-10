import { createAdminClient } from '@/lib/supabase/admin'
import type { PublicTestimonial } from '@/components/public/testimonials-section'

export async function getPublicTestimonials(): Promise<PublicTestimonial[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('testimonials')
      .select('id, client_name, content, rating, session_type, photo_url, is_featured, created_at')
      .eq('is_approved', true)
      .order('is_featured', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Testimonials fetch error:', error)
      return []
    }

    return (data || []).map((item) => ({
      id: item.id,
      name: item.client_name,
      role: item.session_type ? `${String(item.session_type)} Client` : 'Client',
      content: item.content,
      rating: Number(item.rating || 5),
      image: item.photo_url ?? null,
    }))
  } catch (error) {
    console.error('Testimonials fetch error:', error)
    return []
  }
}
