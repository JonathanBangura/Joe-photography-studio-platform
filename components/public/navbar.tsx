'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { PublicBusinessSettings } from '@/lib/business-settings-public'
import { defaultPublicBusinessSettings } from '@/lib/business-settings-public'

const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/gallery', label: 'Portfolio' },
  { href: '/services', label: 'Services' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
]

function formatBrandName(name: string) {
  const cleanName = name || defaultPublicBusinessSettings.business_name
  const parts = cleanName.trim().split(/\s+/)
  if (parts.length < 2) return { first: cleanName, second: '' }
  return { first: parts.slice(0, -1).join(' '), second: parts[parts.length - 1] }
}

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [settings, setSettings] = useState<PublicBusinessSettings>(defaultPublicBusinessSettings)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch('/api/business-settings', { cache: 'no-store' })
        const result = await response.json()
        if (response.ok && result.settings) {
          setSettings({ ...defaultPublicBusinessSettings, ...result.settings })
        }
      } catch (error) {
        console.error('Navbar settings load failed:', error)
      }
    }
    loadSettings()
  }, [])

  const brand = formatBrandName(settings.business_name)

  return (
    <header className={cn('fixed top-0 left-0 right-0 z-50 transition-all duration-300', isScrolled ? 'bg-background/95 backdrop-blur-md border-b border-border shadow-sm' : 'bg-transparent')}>
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight">
              {brand.first}{brand.second && <span className="text-primary">{brand.second}</span>}
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-accent">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/auth/login"><Button variant="ghost" size="sm">Sign In</Button></Link>
            <Link href="/booking"><Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Book Now</Button></Link>
          </div>

          <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 rounded-lg hover:bg-accent transition-colors" aria-label="Toggle menu">
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {isOpen && (
          <div className="md:hidden pb-6 animate-fade-in">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setIsOpen(false)} className="px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors">
                  {link.label}
                </Link>
              ))}
              <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border">
                <Link href="/auth/login" onClick={() => setIsOpen(false)}><Button variant="outline" className="w-full">Sign In</Button></Link>
                <Link href="/booking" onClick={() => setIsOpen(false)}><Button className="w-full bg-primary text-primary-foreground">Book Now</Button></Link>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
