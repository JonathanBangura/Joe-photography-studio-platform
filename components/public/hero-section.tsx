'use client'

import Link from 'next/link'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1554048612-b6a482bc67e5?q=80&w=2070&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="max-w-4xl">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">Award-Winning Photography Studio</span>
          </div>

          {/* Headline */}
          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
            Capturing{' '}
            <span className="text-gold-gradient">Timeless</span>
            <br />
            Moments
          </h1>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            From intimate portraits to grand celebrations, we transform your 
            precious moments into stunning visual stories that last forever.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link href="/booking">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 h-14 gap-2 group">
                Book a Session
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/gallery">
              <Button variant="outline" size="lg" className="text-base px-8 h-14 gap-2 border-border hover:bg-accent">
                <Play className="w-5 h-5" />
                View Portfolio
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-border/50 max-w-lg animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div>
              <p className="text-3xl sm:text-4xl font-serif font-bold text-primary">500+</p>
              <p className="text-sm text-muted-foreground mt-1">Happy Clients</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-serif font-bold text-primary">12+</p>
              <p className="text-sm text-muted-foreground mt-1">Years Experience</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-serif font-bold text-primary">50k+</p>
              <p className="text-sm text-muted-foreground mt-1">Photos Delivered</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1">
          <div className="w-1.5 h-3 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    </section>
  )
}
