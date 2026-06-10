import { Navbar } from '@/components/public/navbar'
import { Footer } from '@/components/public/footer'
import { AboutSection } from '@/components/public/about-section'
import { CtaSection } from '@/components/public/cta-section'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20">
        <AboutSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  )
}
