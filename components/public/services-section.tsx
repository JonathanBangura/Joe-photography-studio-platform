'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Camera, Heart, Clock, Award, Sparkles, Users, Building2, Package, Baby } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { defaultCurrencySettings, formatDisplayPrice, type CurrencySettings } from '@/lib/currency'

type PublicService = {
  id: string
  name: string
  description: string | null
  session_type: string
  base_price: number
  duration_minutes: number
  includes: string[] | null
}

const fallbackServices: PublicService[] = [
  { id: 'wedding', name: 'Wedding Photography', description: 'Capture every magical moment of your special day with our comprehensive wedding photography packages.', session_type: 'wedding', base_price: 2500, duration_minutes: 600, includes: [] },
  { id: 'portrait', name: 'Portrait Sessions', description: 'Professional portrait photography for individuals, couples, or small groups in studio or on location.', session_type: 'portrait', base_price: 350, duration_minutes: 120, includes: [] },
  { id: 'event', name: 'Event Coverage', description: 'Document your corporate events, parties, and celebrations with professional photography.', session_type: 'event', base_price: 800, duration_minutes: 240, includes: [] },
  { id: 'product', name: 'Product Photography', description: 'High-quality product images for e-commerce, catalogs, and marketing materials.', session_type: 'product', base_price: 150, duration_minutes: 60, includes: [] },
  { id: 'family', name: 'Family Sessions', description: "Create lasting memories with beautiful family portraits that you'll treasure for generations.", session_type: 'family', base_price: 450, duration_minutes: 90, includes: [] },
  { id: 'corporate', name: 'Corporate & Headshots', description: 'Professional headshots and corporate photography to elevate your business image.', session_type: 'corporate', base_price: 250, duration_minutes: 30, includes: [] },
]

const features = [
  { icon: Camera, title: 'Premium Equipment', description: 'State-of-the-art cameras and lighting for exceptional quality.' },
  { icon: Clock, title: 'Fast Turnaround', description: 'Receive your edited photos within 2-4 weeks.' },
  { icon: Award, title: 'Award-Winning', description: 'Recognized for excellence in photography artistry.' },
]

function getServiceIcon(service: PublicService) {
  const value = `${service.name} ${service.session_type}`.toLowerCase()
  if (value.includes('wedding')) return Heart
  if (value.includes('family')) return Users
  if (value.includes('corporate') || value.includes('headshot')) return Building2
  if (value.includes('event')) return Sparkles
  if (value.includes('product')) return Package
  if (value.includes('maternity') || value.includes('newborn')) return Baby
  return Camera
}

function getServiceHref(service: PublicService) {
  return `/services#${String(service.session_type || service.id).toLowerCase()}`
}

export function ServicesSection() {
  const [services, setServices] = useState<PublicService[]>(fallbackServices)
  const [loading, setLoading] = useState(true)
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(defaultCurrencySettings)

  useEffect(() => {
    async function loadServices() {
      try {
        const response = await fetch('/api/public/services', { cache: 'no-store' })
        const result = await response.json()

        if (response.ok && Array.isArray(result.services) && result.services.length > 0) {
          setServices(result.services)
        }
      } catch (error) {
        console.error('Homepage services load failed:', error)
      } finally {
        setLoading(false)
      }
    }

    loadServices()
  }, [])

  useEffect(() => {
    async function loadCurrencySettings() {
      try {
        const response = await fetch('/api/business-settings', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.settings) {
          setCurrencySettings({ ...defaultCurrencySettings, ...result.settings })
        }
      } catch (error) {
        console.error('Currency settings load failed:', error)
      }
    }

    loadCurrencySettings()
  }, [])

  const visibleServices = useMemo(() => services.slice(0, 6), [services])

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-medium mb-3">Our Services</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">Photography for Every Occasion</h2>
          <p className="text-lg text-muted-foreground">
            From intimate moments to grand celebrations, we offer a range of professional photography services tailored to your unique vision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {visibleServices.map((service, index) => {
            const Icon = getServiceIcon(service)
            return (
              <Link key={service.id} href={getServiceHref(service)}>
                <Card className={`h-full hover-lift bg-card border-border hover:border-primary/50 transition-all duration-300 group ${index === 0 ? 'ring-2 ring-primary/20' : ''}`}>
                  <CardContent className="p-6">
                    {index === 0 && <span className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full mb-4">Most Popular</span>}
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-serif text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{service.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{service.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">{formatDisplayPrice(service.base_price, currencySettings, 'From ')}</span>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={feature.title} className={`flex items-start gap-4 ${index !== features.length - 1 ? 'md:border-r md:border-border md:pr-8' : ''}`}>
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold mb-1">{feature.title}</h4>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-12">
          <Link href="/services">
            <Button variant="outline" size="lg" className="gap-2" disabled={loading}>
              View All Services
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
