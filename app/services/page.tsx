import { Navbar } from '@/components/public/navbar'
import { Footer } from '@/components/public/footer'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Camera, Heart, Users, Building2, Package, Baby, Sparkles, Calendar } from 'lucide-react'
import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/admin'

type Service = {
  id: string
  name: string
  description: string | null
  session_type: string
  base_price: number
  duration_minutes: number
  includes: string[] | null
}

const fallbackServices: Service[] = [
  {
    id: 'wedding',
    name: 'Wedding Photography',
    description: 'Capture every magical moment of your special day with our comprehensive wedding photography packages.',
    session_type: 'wedding',
    base_price: 2500,
    duration_minutes: 600,
    includes: [
      'Full day coverage (up to 10 hours)',
      'Second photographer included',
      'Engagement session',
      '500+ edited digital images',
      'Online gallery for sharing',
      'Wedding album design consultation',
    ],
  },
]

async function getServices(): Promise<Service[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('services')
      .select('id,name,description,session_type,base_price,duration_minutes,includes')
      .eq('is_active', true)
      .order('base_price', { ascending: false })

    if (error) throw error
    return (data || []) as Service[]
  } catch (error) {
    console.error('Services page load failed:', error)
    return fallbackServices
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

function formatPrice(value: number) {
  return `Starting at $${Number(value || 0).toLocaleString()}`
}

export default async function ServicesPage() {
  const services = await getServices()

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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => {
                const Icon = getServiceIcon(service)
                const features = Array.isArray(service.includes) ? service.includes : []

                return (
                  <Card key={service.id} id={String(service.session_type || service.id).toLowerCase()} className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors group">
                    <CardHeader>
                      <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-xl font-serif">{service.name}</CardTitle>
                      <CardDescription className="text-pretty">{service.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-bold text-primary mb-6">{formatPrice(service.base_price)}</p>
                      <ul className="space-y-3 mb-6">
                        {features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3 text-sm">
                            <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Button asChild className="w-full" variant="outline">
                        <Link href="/booking">
                          <Calendar className="mr-2 h-4 w-4" />
                          Book This Package
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
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
