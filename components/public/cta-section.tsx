import Link from 'next/link'
import { ArrowRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2064&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-background/90" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Limited Availability</span>
          </div>

          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            Ready to Create Something{' '}
            <span className="text-gold-gradient">Beautiful</span>?
          </h2>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Let&apos;s discuss your vision and create stunning photographs that you&apos;ll 
            treasure for a lifetime. Book your session today.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/booking">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 h-14 gap-2 group">
                Book Your Session
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outline" size="lg" className="text-base px-8 h-14 border-border hover:bg-accent">
                Get in Touch
              </Button>
            </Link>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 pt-8 border-t border-border/50">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Quick Response Time
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Flexible Scheduling
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Satisfaction Guaranteed
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
