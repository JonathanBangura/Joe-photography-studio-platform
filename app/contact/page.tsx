"use client"

import { useEffect, useMemo, useState } from "react"
import { Navbar } from "@/components/public/navbar"
import { Footer } from "@/components/public/footer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, Phone, Mail, Clock, Send, CheckCircle } from "lucide-react"
import type { PublicBusinessSettings } from "@/lib/business-settings-public"
import { defaultPublicBusinessSettings } from "@/lib/business-settings-public"

const defaultSessionTypes = [
  { value: "portrait", label: "Portrait Photography" },
  { value: "wedding", label: "Wedding Photography" },
  { value: "event", label: "Event Coverage" },
  { value: "corporate", label: "Corporate/Headshots" },
  { value: "product", label: "Product Photography" },
  { value: "family", label: "Family Sessions" },
  { value: "maternity", label: "Maternity" },
  { value: "newborn", label: "Newborn" },
]

function categoryLabel(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildAddress(settings: PublicBusinessSettings) {
  return [settings.address, settings.city, settings.state, settings.country]
    .filter(Boolean)
    .join(', ')
}

function formatWorkingHours(value: string) {
  return (value || defaultPublicBusinessSettings.working_hours)
    .split('\n')
    .filter(Boolean)
}

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [settings, setSettings] = useState<PublicBusinessSettings>(
    defaultPublicBusinessSettings,
  )
  const [sessionTypes, setSessionTypes] = useState(defaultSessionTypes)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
    session_type: "",
    preferred_date: "",
  })

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
        console.error('Contact settings load failed:', error)
      }
    }

    async function loadServiceCategories() {
      try {
        const response = await fetch('/api/public/services', { cache: 'no-store' })
        const result = await response.json()
        if (!response.ok || !Array.isArray(result.services)) return

        const categories = new Map<string, string>()
        result.services.forEach((service: { session_type?: unknown }) => {
          const slug = String(service.session_type || '').trim().toLowerCase()
          if (slug && !categories.has(slug)) categories.set(slug, categoryLabel(slug))
        })

        if (categories.size > 0) {
          setSessionTypes(
            Array.from(categories, ([value, label]) => ({ value, label }))
              .sort((first, second) => first.label.localeCompare(second.label)),
          )
        }
      } catch (error) {
        console.error('Contact service categories load failed:', error)
      }
    }

    void Promise.all([loadSettings(), loadServiceCategories()])
  }, [])

  const studioAddress = useMemo(() => buildAddress(settings), [settings])
  const workingHours = useMemo(
    () => formatWorkingHours(settings.working_hours),
    [settings.working_hours],
  )
  const phoneHref = settings.phone ? `tel:${settings.phone.replace(/\s+/g, '')}` : '#'
  const emailHref = settings.email ? `mailto:${settings.email}` : '#'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Unable to send message")
      }

      setIsSuccess(true)
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
        session_type: "",
        preferred_date: "",
      })
    } catch (error) {
      console.error("Contact form error:", error)
      alert(error instanceof Error ? error.message : "Unable to send message")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24">
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-6xl text-center">
            <span className="text-primary font-medium tracking-widest text-sm uppercase">Get in Touch</span>
            <h1 className="text-4xl md:text-6xl font-serif font-bold mt-4 mb-6 text-balance">
              Let&apos;s Create Something <span className="text-primary">Beautiful</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto text-pretty">
              Ready to capture your special moments? We&apos;d love to hear from you. 
              Fill out the form below or reach out directly.
            </p>
          </div>
        </section>

        <section className="py-12 px-4 pb-24">
          <div className="container mx-auto max-w-6xl">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="space-y-6">
                <Card className="bg-card/50 border-border/50">
                  <CardContent className="flex items-start gap-4 p-6">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Studio Location</h3>
                      <p className="text-muted-foreground text-sm whitespace-pre-line">
                        {studioAddress || 'Studio address not set'}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                  <CardContent className="flex items-start gap-4 p-6">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Phone</h3>
                      {settings.phone ? (
                        <a
                          href={phoneHref}
                          className="text-muted-foreground text-sm hover:text-primary transition-colors"
                        >
                          {settings.phone}
                        </a>
                      ) : (
                        <p className="text-muted-foreground text-sm">Phone not set</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                  <CardContent className="flex items-start gap-4 p-6">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email</h3>
                      {settings.email ? (
                        <a
                          href={emailHref}
                          className="text-muted-foreground text-sm hover:text-primary transition-colors"
                        >
                          {settings.email}
                        </a>
                      ) : (
                        <p className="text-muted-foreground text-sm">Email not set</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/50 border-border/50">
                  <CardContent className="flex items-start gap-4 p-6">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <Clock className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Working Hours</h3>
                      <p className="text-muted-foreground text-sm">
                        {workingHours.map((line, index) => (
                          <span key={line}>
                            {line}
                            {index < workingHours.length - 1 && <br />}
                          </span>
                        ))}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="bg-card/50 border-border/50">
                  <CardHeader>
                    <CardTitle className="text-2xl font-serif">Send Us a Message</CardTitle>
                    <CardDescription>
                      Fill out the form below and we&apos;ll get back to you within 24 hours.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isSuccess ? (
                      <div className="text-center py-12">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-6">
                          <CheckCircle className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-2xl font-serif font-bold mb-2">Message Sent!</h3>
                        <p className="text-muted-foreground mb-6">
                          Thank you for reaching out. We&apos;ll be in touch soon.
                        </p>
                        <Button onClick={() => setIsSuccess(false)} variant="outline">
                          Send Another Message
                        </Button>
                      </div>
                    ) : (
                      <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                              id="name"
                              required
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              placeholder="John Doe"
                              className="bg-background/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="email">Email Address *</Label>
                            <Input
                              id="email"
                              type="email"
                              required
                              value={formData.email}
                              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              placeholder="john@example.com"
                              className="bg-background/50"
                            />
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={formData.phone}
                              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                              placeholder="+232 00 000000"
                              className="bg-background/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="session_type">Session Type</Label>
                            <Select
                              value={formData.session_type}
                              onValueChange={(value) => setFormData({ ...formData, session_type: value })}
                            >
                              <SelectTrigger className="bg-background/50">
                                <SelectValue placeholder="Select a session type" />
                              </SelectTrigger>
                              <SelectContent>
                                {sessionTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="preferred_date">Preferred Date</Label>
                            <Input
                              id="preferred_date"
                              type="date"
                              value={formData.preferred_date}
                              onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                              className="bg-background/50"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="subject">Subject</Label>
                            <Input
                              id="subject"
                              value={formData.subject}
                              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                              placeholder="Inquiry about..."
                              className="bg-background/50"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="message">Message *</Label>
                          <Textarea
                            id="message"
                            required
                            rows={5}
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            placeholder="Tell us about your project, event, or any questions you have..."
                            className="bg-background/50 resize-none"
                          />
                        </div>

                        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                          {isSubmitting ? (
                            "Sending..."
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Send Message
                            </>
                          )}
                        </Button>
                      </form>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
