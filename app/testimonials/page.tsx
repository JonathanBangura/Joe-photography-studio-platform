import { Navbar } from '@/components/public/navbar'
import { Footer } from '@/components/public/footer'
import { TestimonialsSection, type PublicTestimonial } from '@/components/public/testimonials-section'
import { createAdminClient } from '@/lib/supabase/admin'

async function getTestimonials(): Promise<PublicTestimonial[]> {
  try {
    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('testimonials')
      .select('id, client_name, content, rating, session_type, is_featured, created_at')
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
      image: null,
    }))
  } catch (error) {
    console.error('Testimonials page error:', error)
    return []
  }
}

export default async function TestimonialsPage() {
  const testimonials = await getTestimonials()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <TestimonialsSection initialTestimonials={testimonials} showHeader />
      </main>
      <Footer />
    </div>
  )
}
