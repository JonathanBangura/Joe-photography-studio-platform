'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Camera, Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react'
import type { PublicBusinessSettings } from '@/lib/business-settings-public'
import { defaultPublicBusinessSettings } from '@/lib/business-settings-public'

const footerLinks = {
  services: [
    { label: 'Wedding Photography', href: '/services#wedding' },
    { label: 'Portrait Sessions', href: '/services#portrait' },
    { label: 'Event Coverage', href: '/services#event' },
    { label: 'Corporate Photography', href: '/services#corporate' },
    { label: 'Family Sessions', href: '/services#family' },
  ],
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Portfolio', href: '/gallery' },
    { label: 'Testimonials', href: '/testimonials' },
  ],
  support: [
    { label: 'Contact Us', href: '/contact' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Client Portal', href: '/portal' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
  ],
}

function splitStudioName(name: string) {
  const trimmed = name.trim() || 'Joe Studio'
  const parts = trimmed.split(' ')

  if (parts.length === 1) {
    return { first: trimmed, rest: '' }
  }

  return {
    first: parts.slice(0, -1).join(' '),
    rest: parts[parts.length - 1],
  }
}

function buildAddress(settings: PublicBusinessSettings) {
  return [settings.address, settings.city, settings.state, settings.country]
    .filter(Boolean)
    .join(', ')
}

export function Footer() {
  const [settings, setSettings] = useState<PublicBusinessSettings>(
    defaultPublicBusinessSettings,
  )

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/business-settings', {
          cache: 'no-store',
        })
        const result = await response.json()

        if (response.ok && result.settings) {
          setSettings({ ...defaultPublicBusinessSettings, ...result.settings })
        }
      } catch (error) {
        console.error('Footer settings load failed:', error)
      }
    }

    loadSettings()
  }, [])

  const brand = splitStudioName(settings.business_name)
  const address = buildAddress(settings)
  const instagramUrl = settings.social_instagram || 'https://instagram.com'
  const facebookUrl = settings.social_facebook || 'https://facebook.com'
  const emailHref = settings.email ? `mailto:${settings.email}` : '#'
  const phoneHref = settings.phone ? `tel:${settings.phone.replace(/\s+/g, '')}` : '#'

  const tagline = useMemo(() => {
    return (
      settings.tagline ||
      "Capturing life's precious moments with artistry and elegance. Professional photography services that tell your unique story."
    )
  }, [settings.tagline])

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <span className="font-serif text-2xl font-semibold tracking-tight">
                {brand.first}
                {brand.rest && <span className="text-primary"> {brand.rest}</span>}
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
              {tagline}
            </p>
            <div className="flex items-center gap-4">
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-accent flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-accent flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href={emailHref}
                className="w-10 h-10 rounded-full bg-accent flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                aria-label="Email"
              >
                <Mail className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Services</h3>
            <ul className="space-y-3">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Company</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>{address || 'Studio address not set'}</span>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <a href={phoneHref} className="hover:text-primary transition-colors">
                  {settings.phone || 'Phone not set'}
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-muted-foreground">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <a href={emailHref} className="hover:text-primary transition-colors">
                  {settings.email || 'Email not set'}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} {settings.business_name}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Terms
            </Link>
            <Link href="/cookies" className="text-sm text-muted-foreground hover:text-primary transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
