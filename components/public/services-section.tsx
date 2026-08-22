'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, Camera, Heart, Clock, Award, Sparkles, Users, Building2, Package, Baby } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { defaultCurrencySettings, formatDisplayAmounts, type CurrencySettings } from '@/lib/currency'
import { getServicePricingType, getServiceUnitLabel } from '@/lib/booking-pricing'

type PublicService = {
  id: string
  name: string
  description: string | null
  session_type: string
  base_price: number
  base_price_sle?: number | null
  duration_minutes: number
  includes: string[] | null
  pricing_type?: 'fixed' | 'per_unit' | null
  unit_label?: string | null
}

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
  return `/services#service-${service.id}`
}

export function ServicesSection() {
  const [services, setServices] = useState<PublicService[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [currencySettings, setCurrencySettings] = useState<CurrencySettings>(defaultCurrencySettings)

  useEffect(() => {
    async function loadServices() {
      try {
        const response = await fetch('/api/public/services', { cache: 'no-store' })
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Unable to load services')
        setServices(Array.isArray(result.services) ? result.services : [])
      } catch (error) {
        console.error('Homepage services load failed:', error)
        setLoadError(true)
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
          {loading && [0, 1, 2].map((item) => (
            <Card key={item} className="h-56 animate-pulse border-border bg-card">
              <CardContent className="p-6">
                <div className="mb-5 h-12 w-12 rounded-xl bg-muted" />
                <div className="mb-3 h-6 w-2/3 rounded bg-muted" />
                <div className="mb-2 h-4 w-full rounded bg-muted" />
                <div className="h-4 w-4/5 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}

          {!loading && visibleServices.map((service) => {
            const Icon = getServiceIcon(service)
            const localPrice = Number(service.base_price_sle || service.base_price * currencySettings.usd_to_sle_rate)
            const isPerUnit = getServicePricingType(service) === 'per_unit'
            return (
              <Link key={service.id} href={getServiceHref(service)}>
                <Card className="h-full hover-lift bg-card border-border hover:border-primary/50 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="font-serif text-xl font-semibold mb-2 group-hover:text-primary transition-colors">{service.name}</h3>
                    <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{service.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-primary">
                        {formatDisplayAmounts(service.base_price, localPrice, currencySettings)}
                        {isPerUnit && (
                          <span className="block text-xs font-normal text-muted-foreground">per {getServiceUnitLabel(service)}</span>
                        )}
                      </span>
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}

          {!loading && visibleServices.length === 0 && (
            <Card className="border-dashed md:col-span-2 lg:col-span-3">
              <CardContent className="py-12 text-center">
                <Camera className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                <p className="font-semibold">
                  {loadError ? 'Services are temporarily unavailable.' : 'No active services are available right now.'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Please contact JoeStudio or check back shortly.</p>
              </CardContent>
            </Card>
          )}
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
