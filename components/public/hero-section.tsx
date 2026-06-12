'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  defaultPublicBusinessSettings,
  type PublicBusinessSettings,
} from '@/lib/business-settings-public'

function formatHeroTitle(title: string, highlight: string) {
  if (!highlight || !title.includes(highlight)) {
    return <>{title}</>
  }

  const parts = title.split(highlight)
  return (
    <>
      {parts[0]}
      <span className="text-gold-gradient">{highlight}</span>
      {parts.slice(1).join(highlight)}
    </>
  )
}

export function HeroSection() {
  const [settings, setSettings] = useState<PublicBusinessSettings>(
    defaultPublicBusinessSettings,
  )

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/business-settings', { cache: 'no-store' })
        const result = await response.json()

        if (response.ok && result.settings) {
          setSettings({ ...defaultPublicBusinessSettings, ...result.settings })
        }
      } catch (error) {
        console.error('Hero settings load failed:', error)
      }
    }

    loadSettings()
  }, [])

  const heroTitle = useMemo(
    () => formatHeroTitle(settings.hero_title, settings.hero_highlight),
    [settings.hero_title, settings.hero_highlight],
  )

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${settings.hero_background_image}')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/95 via-background/80 to-background/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-sm font-medium text-primary">
              {settings.hero_badge}
            </span>
          </div>

          <h1 className="font-serif text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-slide-up">
            {heroTitle}
          </h1>

          <p className="text-xl sm:text-2xl text-muted-foreground max-w-2xl mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            {settings.hero_subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link href={settings.hero_primary_button_link || '/booking'}>
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 h-14 gap-2 group">
                {settings.hero_primary_button_text}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href={settings.hero_secondary_button_link || '/gallery'}>
              <Button variant="outline" size="lg" className="text-base px-8 h-14 gap-2 border-border hover:bg-accent">
                <Play className="w-5 h-5" />
                {settings.hero_secondary_button_text}
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-8 mt-16 pt-8 border-t border-border/50 max-w-lg animate-slide-up" style={{ animationDelay: '0.3s' }}>
            <div>
              <p className="text-3xl sm:text-4xl font-serif font-bold text-primary">{settings.clients_count}</p>
              <p className="text-sm text-muted-foreground mt-1">Happy Clients</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-serif font-bold text-primary">{settings.years_experience}</p>
              <p className="text-sm text-muted-foreground mt-1">Years Experience</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-serif font-bold text-primary">{settings.photos_delivered}</p>
              <p className="text-sm text-muted-foreground mt-1">Photos Delivered</p>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1">
          <div className="w-1.5 h-3 rounded-full bg-primary animate-pulse" />
        </div>
      </div>
    </section>
  )
}
