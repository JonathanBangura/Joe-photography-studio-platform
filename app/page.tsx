import { Navbar } from '@/components/public/navbar'
import { HeroSection } from '@/components/public/hero-section'
import { ServicesSection } from '@/components/public/services-section'
import { GallerySection } from '@/components/public/gallery-section'
import { AboutSection } from '@/components/public/about-section'
import { TestimonialsSection } from '@/components/public/testimonials-section'
import { CTASection } from '@/components/public/cta-section'
import { Footer } from '@/components/public/footer'

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <GallerySection />
      <AboutSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </main>
  )
}
