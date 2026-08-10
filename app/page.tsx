import { Navbar } from '@/components/public/navbar'
import { HeroSection } from '@/components/public/hero-section'
import { ServicesSection } from '@/components/public/services-section'
import { GallerySection } from '@/components/public/gallery-section'
import { AboutSection } from '@/components/public/about-section'
import { TestimonialsSection } from '@/components/public/testimonials-section'
import { CTASection } from '@/components/public/cta-section'
import { Footer } from '@/components/public/footer'
import { getPublicTestimonials } from '@/lib/public-testimonials'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const testimonials = await getPublicTestimonials()

  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <GallerySection />
      <AboutSection />
      <TestimonialsSection initialTestimonials={testimonials} />
      <CTASection />
      <Footer />
    </main>
  )
}
