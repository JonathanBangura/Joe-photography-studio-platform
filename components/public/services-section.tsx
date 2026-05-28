'use client'

import Link from 'next/link'
import { ArrowRight, Camera, Heart, Clock, Award, Sparkles, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const services = [
  {
    icon: Heart,
    title: 'Wedding Photography',
    description: 'Capturing the magic of your special day with artistic elegance and authentic emotion.',
    price: 'From $2,500',
    href: '/services#wedding',
    featured: true,
  },
  {
    icon: Users,
    title: 'Portrait Sessions',
    description: 'Professional portraits that reveal your unique personality and style.',
    price: 'From $350',
    href: '/services#portrait',
  },
  {
    icon: Sparkles,
    title: 'Event Coverage',
    description: 'Comprehensive documentation of your corporate events and celebrations.',
    price: 'From $800',
    href: '/services#event',
  },
  {
    icon: Camera,
    title: 'Product Photography',
    description: 'High-quality imagery that showcases your products in their best light.',
    price: 'From $500',
    href: '/services#product',
  },
  {
    icon: Users,
    title: 'Family Sessions',
    description: 'Warm, natural family portraits that capture genuine connections.',
    price: 'From $450',
    href: '/services#family',
  },
  {
    icon: Award,
    title: 'Corporate Headshots',
    description: 'Professional headshots that make a lasting impression.',
    price: 'From $250',
    href: '/services#corporate',
  },
]

const features = [
  {
    icon: Camera,
    title: 'Premium Equipment',
    description: 'State-of-the-art cameras and lighting for exceptional quality.',
  },
  {
    icon: Clock,
    title: 'Fast Turnaround',
    description: 'Receive your edited photos within 2-4 weeks.',
  },
  {
    icon: Award,
    title: 'Award-Winning',
    description: 'Recognized for excellence in photography artistry.',
  },
]

export function ServicesSection() {
  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-primary font-medium mb-3">Our Services</p>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold mb-6">
            Photography for Every Occasion
          </h2>
          <p className="text-lg text-muted-foreground">
            From intimate moments to grand celebrations, we offer a range of professional 
            photography services tailored to your unique vision.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {services.map((service) => (
            <Link key={service.title} href={service.href}>
              <Card className={`h-full hover-lift bg-card border-border hover:border-primary/50 transition-all duration-300 group ${service.featured ? 'ring-2 ring-primary/20' : ''}`}>
                <CardContent className="p-6">
                  {service.featured && (
                    <span className="inline-block px-3 py-1 text-xs font-medium bg-primary/10 text-primary rounded-full mb-4">
                      Most Popular
                    </span>
                  )}
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <service.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-2 group-hover:text-primary transition-colors">
                    {service.title}
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                    {service.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-primary">{service.price}</span>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        {/* Features Bar */}
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

        {/* CTA */}
        <div className="text-center mt-12">
          <Link href="/services">
            <Button variant="outline" size="lg" className="gap-2">
              View All Services
              <ArrowRight className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  )
}
