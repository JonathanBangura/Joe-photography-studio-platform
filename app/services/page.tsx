import { Navbar } from "@/components/public/navbar"
import { Footer } from "@/components/public/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, Camera, Heart, Users, Building2, Package, Baby, Sparkles, Calendar } from "lucide-react"
import Link from "next/link"

const services = [
  {
    icon: Heart,
    title: "Wedding Photography",
    description: "Capture every magical moment of your special day with our comprehensive wedding photography packages.",
    price: "Starting at $2,500",
    features: [
      "Full day coverage (up to 10 hours)",
      "Second photographer included",
      "Engagement session",
      "500+ edited digital images",
      "Online gallery for sharing",
      "Wedding album design consultation",
    ],
  },
  {
    icon: Camera,
    title: "Portrait Sessions",
    description: "Professional portrait photography for individuals, couples, or small groups in studio or on location.",
    price: "Starting at $350",
    features: [
      "1-2 hour session",
      "Multiple outfit changes",
      "Professional retouching",
      "30+ edited digital images",
      "Print release included",
      "Studio or outdoor location",
    ],
  },
  {
    icon: Users,
    title: "Family Sessions",
    description: "Create lasting memories with beautiful family portraits that you'll treasure for generations.",
    price: "Starting at $450",
    features: [
      "1.5 hour session",
      "Up to 6 family members",
      "Multiple groupings",
      "40+ edited digital images",
      "Location of your choice",
      "Print packages available",
    ],
  },
  {
    icon: Building2,
    title: "Corporate & Headshots",
    description: "Professional headshots and corporate photography to elevate your business image.",
    price: "Starting at $250",
    features: [
      "30-minute individual session",
      "Multiple backgrounds",
      "Same-day turnaround available",
      "5 fully retouched images",
      "Team packages available",
      "On-site service option",
    ],
  },
  {
    icon: Sparkles,
    title: "Event Coverage",
    description: "Document your corporate events, parties, and celebrations with professional photography.",
    price: "Starting at $800",
    features: [
      "Up to 4 hours coverage",
      "Candid and posed shots",
      "Quick turnaround (48-72 hrs)",
      "200+ edited images",
      "Online gallery for attendees",
      "Extended hours available",
    ],
  },
  {
    icon: Package,
    title: "Product Photography",
    description: "High-quality product images for e-commerce, catalogs, and marketing materials.",
    price: "Starting at $150/product",
    features: [
      "White background shots",
      "Lifestyle product shots",
      "360-degree views available",
      "High-res files for print/web",
      "Color correction included",
      "Volume discounts available",
    ],
  },
  {
    icon: Baby,
    title: "Maternity & Newborn",
    description: "Celebrate the miracle of new life with tender maternity and newborn photography sessions.",
    price: "Starting at $400",
    features: [
      "In-studio or home sessions",
      "Props and wraps provided",
      "Sibling shots included",
      "35+ edited images",
      "Delicate artistic editing",
      "Birth announcement designs",
    ],
  },
]

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24">
        {/* Hero Section */}
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <span className="text-primary font-medium tracking-widest text-sm uppercase">Our Services</span>
            <h1 className="text-4xl md:text-6xl font-serif font-bold mt-4 mb-6 text-balance">
              Photography Packages & <span className="text-primary">Pricing</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
              We offer a range of professional photography services tailored to capture 
              your most precious moments. Every package is customizable to fit your needs.
            </p>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-12 px-4 pb-24">
          <div className="container mx-auto max-w-7xl">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.map((service) => (
                <Card key={service.title} className="bg-card/50 border-border/50 hover:border-primary/50 transition-colors group">
                  <CardHeader>
                    <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4 group-hover:bg-primary/20 transition-colors">
                      <service.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl font-serif">{service.title}</CardTitle>
                    <CardDescription className="text-pretty">{service.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-primary mb-6">{service.price}</p>
                    <ul className="space-y-3 mb-6">
                      {service.features.map((feature) => (
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
              ))}
            </div>
          </div>
        </section>

        {/* Custom Package CTA */}
        <section className="py-20 px-4 bg-card/50">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-3xl md:text-4xl font-serif font-bold mb-6">
              Need Something <span className="text-primary">Custom</span>?
            </h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
              Don&apos;t see exactly what you&apos;re looking for? We love creating custom packages 
              tailored to your specific needs. Let&apos;s discuss your vision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild size="lg">
                <Link href="/contact">
                  Get a Custom Quote
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/booking">
                  Book a Consultation
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
