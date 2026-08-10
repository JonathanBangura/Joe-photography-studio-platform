import { Navbar } from '@/components/public/navbar'
import { Footer } from '@/components/public/footer'
import { TestimonialsSection } from '@/components/public/testimonials-section'
import { getPublicTestimonials } from '@/lib/public-testimonials'

export const dynamic = 'force-dynamic'

export default async function TestimonialsPage() {
  const testimonials = await getPublicTestimonials()

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
