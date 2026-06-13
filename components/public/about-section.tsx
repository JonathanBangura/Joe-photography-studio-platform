'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Award, Users, Camera, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  defaultPublicBusinessSettings,
  type PublicBusinessSettings,
} from '@/lib/business-settings-public'

export function AboutSection() {
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
        console.error('About settings load failed:', error)
      }
    }

    loadSettings()
  }, [])

  const stats = [
    { icon: Users, value: settings.clients_count, label: 'Happy Clients' },
    { icon: Camera, value: settings.photos_delivered, label: 'Photos Delivered' },
    { icon: Award, value: settings.awards_count, label: 'Awards Won' },
    { icon: Heart, value: settings.years_experience, label: 'Years Experience' },
  ]

  return (
    <section className="py-24 bg-card">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
              <Image
                src={settings.about_image}
                alt={settings.about_label || 'Studio story'}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 bg-background border border-border rounded-xl p-6 shadow-xl max-w-xs">
              <p className="font-serif text-2xl font-bold text-primary mb-1">
                {settings.about_floating_title}
              </p>
              <p className="text-sm text-muted-foreground">
                {settings.about_floating_subtitle}
              </p>
            </div>
          </div>

          <div>
            <p className="text-primary font-medium mb-3">{settings.about_label}</p>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
              {settings.about_title}
            </h2>
            <div className="space-y-4 text-muted-foreground mb-8">
              <p>{settings.about_story}</p>
              <p>{settings.about_mission}</p>
              <p>{settings.about_vision}</p>
            </div>

            <Link href={settings.about_button_link || '/about'}>
              <Button variant="outline" className="gap-2">
                {settings.about_button_text}
              </Button>
            </Link>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-12 pt-8 border-t border-border">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-3">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="text-2xl font-serif font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
