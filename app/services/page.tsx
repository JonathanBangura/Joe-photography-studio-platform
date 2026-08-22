import { Navbar } from '@/components/public/navbar'
import { Footer } from '@/components/public/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Camera, Heart, Users, Building2, Package, Baby, Sparkles, Calendar } from 'lucide-react'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPublicBusinessSettings } from '@/lib/business-settings-public'
import { formatDisplayAmounts, normalizeCurrencySettings } from '@/lib/currency'
import { getServicePricingType, getServiceUnitLabel } from '@/lib/booking-pricing'

export const dynamic = 'force-dynamic'

type Service = {
  id: string
  name: string
  description: string | null
  session_type: string
  base_price: number
  base_price_sle: number | null
  duration_minutes: number
  includes: string[] | null
  pricing_type: 'fixed' | 'per_unit' | null
  unit_label: string | null
}

async function getServices(): Promise<{ services: Service[]; loadError: boolean }> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('services')
      .select('id,name,description,session_type,base_price,base_price_sle,duration_minutes,includes,pricing_type,unit_label')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { services: (data || []) as Service[], loadError: false }
  } catch (error) {
    console.error('Services page load failed:', error)
    return { services: [], loadError: true }
  }
}

function getServiceIcon(service: Service) {
  const value = `${service.name} ${service.session_type}`.toLowerCase()
  if (value.includes('wedding')) return Heart
  if (value.includes('family')) return Users
  if (value.includes('corporate') || value.includes('headshot')) return Building2
  if (value.includes('event')) return Sparkles
  if (value.includes('product')) return Package
  if (value.includes('maternity') || value.includes('newborn')) return Baby
  return Camera
}

export default async function ServicesPage() {
  const [{ services, loadError }, settings] = await Promise.all([
    getServices(),
    getPublicBusinessSettings(),
  ])
  const currencySettings = normalizeCurrencySettings(settings)

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24">
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <span className="text-primary font-medium tracking-widest text-sm uppercase">Our Services</span>
            <h1 className="text-4xl md:text-6xl font-serif font-bold mt-4 mb-6 text-balance">
              Photography Packages & <span className="text-primary">Pricing</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
              We offer a range of professional photography services tailored to capture your most precious moments. Every package is customizable to fit your needs.
            </p>
          </div>
        </section>

        <section className="py-12 px-4 pb-24">
          <div className="container mx-auto max-w-7xl">
            {services.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => {
                  const Icon = getServiceIcon(service)
                  const features = Array.isArray(service.includes) ? service.includes : []
                  const localPrice = Number(service.base_price_sle || service.base_price * currencySettings.usd_to_sle_rate)
                  const isPerUnit = getServicePricingType(service) === 'per_unit'

                  return (
                    <Card
                      key={service.id}
                      id={`service-${service.id}`}
                      className="flex h-full flex-col bg-card/50 border-border/50 hover:border-primary/50 transition-colors group"
                    >
                      <CardHeader>
                        <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-xl font-serif">{service.name}</CardTitle>
                        <CardDescription className="text-pretty">{service.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-1 flex-col">
                        <div className="mb-6">
                          <p className="text-2xl font-bold text-primary">
                            {formatDisplayAmounts(service.base_price, localPrice, currencySettings, isPerUnit ? '' : 'Package price: ')}
                          </p>
                          {isPerUnit && (
                            <p className="text-sm text-muted-foreground">per {getServiceUnitLabel(service)}</p>
                          )}
                          <p className="mt-2 text-sm text-muted-foreground">{service.duration_minutes} minutes</p>
                        </div>
                        {features.length > 0 && (
                          <ul className="space-y-3 mb-6">
                            {features.map((feature) => (
                              <li key={feature} className="flex items-start gap-3 text-sm">
                                <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                                <span className="text-muted-foreground">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <Button asChild className="mt-auto w-full">
                          <Link href={`/booking?service=${encodeURIComponent(service.id)}`}>
                            <Calendar className="mr-2 h-4 w-4" />
                            Book This Service
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-16 text-center">
                  <Camera className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
                  <h2 className="font-serif text-2xl font-semibold">
                    {loadError ? 'Services are temporarily unavailable' : 'No services are available right now'}
                  </h2>
                  <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
                    {loadError
                      ? 'Please refresh the page or contact JoeStudio for assistance.'
                      : 'The studio is currently updating its service list. Please check back shortly.'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section className="py-20 px-4 bg-card/50">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
              Need Something <span className="text-primary">Custom</span>?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Don&apos;t see exactly what you&apos;re looking for? We love creating custom packages tailored to your specific needs. Let&apos;s discuss your vision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg"><Link href="/contact">Get a Custom Quote</Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/booking">Book a Consultation</Link></Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
