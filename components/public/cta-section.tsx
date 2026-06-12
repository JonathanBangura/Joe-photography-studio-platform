'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  defaultPublicBusinessSettings,
  type PublicBusinessSettings,
} from '@/lib/business-settings-public'

function formatCtaTitle(title: string, highlight: string) {
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

export function CTASection() {
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
        console.error('CTA settings load failed:', error)
      }
    }

    loadSettings()
  }, [])

  const ctaTitle = useMemo(
    () => formatCtaTitle(settings.cta_title, settings.cta_highlight),
    [settings.cta_title, settings.cta_highlight],
  )

  const trustItems = [settings.cta_trust_1, settings.cta_trust_2, settings.cta_trust_3].filter(Boolean)

  return (
    <section className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('${settings.cta_background_image}')`,
          }}
        />
        <div className="absolute inset-0 bg-background/90" />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">{settings.cta_badge}</span>
          </div>

          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
            {ctaTitle}
          </h2>

          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            {settings.cta_subtitle}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href={settings.cta_primary_button_link || '/booking'}>
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 text-base px-8 h-14 gap-2 group">
                {settings.cta_primary_button_text}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href={settings.cta_secondary_button_link || '/contact'}>
              <Button variant="outline" size="lg" className="text-base px-8 h-14 border-border hover:bg-accent">
                {settings.cta_secondary_button_text}
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 mt-12 pt-8 border-t border-border/50">
            {trustItems.map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
