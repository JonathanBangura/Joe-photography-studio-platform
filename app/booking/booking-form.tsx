'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { createAuditLog } from '@/lib/audit-log-client'
import { createInvoiceForBooking, createWorkflowForBooking } from '@/lib/business-logic-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Clock, Camera, CheckCircle, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string
  session_type: string
  base_price: number
  duration_minutes: number
  includes: string[]
}

interface BookingFormProps {
  services: Service[]
  availability: Array<{ day_of_week: number; start_time: string; end_time: string }>
  blockedDates: string[]
  clientInfo: {
    profile: { full_name: string; email: string; phone: string } | null
    client: { address: string; city: string } | null
  } | null
  isLoggedIn: boolean
}

export function BookingForm({ services, availability, blockedDates, clientInfo, isLoggedIn }: BookingFormProps) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [formData, setFormData] = useState({
    name: clientInfo?.profile?.full_name || '',
    email: clientInfo?.profile?.email || '',
    phone: clientInfo?.profile?.phone || '',
    location: '',
    notes: '',
  })

  const timeSlots = [
    '09:00', '10:00', '11:00', '12:00', '13:00', 
    '14:00', '15:00', '16:00', '17:00', '18:00'
  ]

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // If not logged in, submit as contact inquiry
      if (!isLoggedIn) {
        const { error } = await supabase.from('contact_submissions').insert({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          subject: `Booking Request: ${selectedService?.name}`,
          message: `Date: ${selectedDate}\nTime: ${selectedTime}\nLocation: ${formData.location}\nNotes: ${formData.notes}`,
          session_type: selectedService?.session_type,
          preferred_date: selectedDate,
        })
        
        if (error) throw error
        setStep(4) // Success step
      } else {
        if (!selectedService || selectedService.id.startsWith('sample-')) {
          throw new Error('Please select a valid service from the studio service list')
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError || !user) throw userError || new Error('User not found')

        // Keep the profile updated with the latest contact details provided by the client.
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id)

        if (profileError) throw profileError

        let clientId = clientInfo?.client?.id

        if (!clientId) {
          const { data: createdClient, error: clientError } = await supabase
            .from('clients')
            .insert({
              profile_id: user.id,
              address: formData.location || null,
              preferred_contact: 'email',
              notes: formData.notes || null,
            })
            .select('*')
            .single()

          if (clientError) throw clientError
          clientId = createdClient.id
        }

        const selectedStart = new Date(`2000-01-01T${selectedTime}:00`)
        selectedStart.setMinutes(selectedStart.getMinutes() + Number(selectedService.duration_minutes || 60))
        const endTime = selectedStart.toTimeString().slice(0, 5)

        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            client_id: clientId,
            service_id: selectedService.id,
            booking_date: selectedDate,
            start_time: selectedTime,
            end_time: endTime,
            location: formData.location || 'Studio',
            status: 'pending',
            total_amount: selectedService.base_price,
            notes: formData.notes || null,
          })
          .select('*')
          .single()

        if (bookingError) throw bookingError

        await createInvoiceForBooking({
          bookingId: booking.id,
          clientId,
          totalAmount: Number(selectedService.base_price || 0),
          notes: 'Auto-created from online booking request',
        })

        await createWorkflowForBooking({
          bookingId: booking.id,
          bookingDate: selectedDate,
          priority: 'medium',
          notes: 'Auto-created from online booking request',
        })

        await createAuditLog({
          action: 'create',
          resource_type: 'booking',
          resource_id: booking.id,
          new_data: booking,
        })

        setStep(4)
      }
    } catch (error) {
      console.error('Booking error:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get minimum date (tomorrow)
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  // Get max date (3 months from now)
  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 3)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  return (
    <div className="min-h-[80vh] py-20">
      <div className="container max-w-4xl mx-auto px-4">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  step >= s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {step > s ? <CheckCircle className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-20 h-1 mx-2 transition-all ${
                    step > s ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Session</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Select the type of photography session that best fits your needs
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {services.length > 0 ? (
                services.map((service) => (
                  <Card
                    key={service.id}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      selectedService?.id === service.id
                        ? 'border-primary ring-2 ring-primary/20'
                        : ''
                    }`}
                    onClick={() => setSelectedService(service)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-xl">{service.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {service.description}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">
                            ${service.base_price}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {service.duration_minutes} min
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {service.includes?.map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <Sparkles className="w-4 h-4 text-primary" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))
              ) : (
                // Show sample services if none in database
                <>
                  {[
                    { name: 'Portrait Session', price: 250, duration: 60, desc: 'Professional headshots and portraits' },
                    { name: 'Wedding Package', price: 2500, duration: 480, desc: 'Full day wedding coverage' },
                    { name: 'Family Session', price: 350, duration: 90, desc: 'Capture family moments together' },
                    { name: 'Event Coverage', price: 500, duration: 180, desc: 'Corporate and private events' },
                  ].map((service, i) => (
                    <Card
                      key={i}
                      className={`cursor-pointer transition-all hover:border-primary ${
                        selectedService?.name === service.name
                          ? 'border-primary ring-2 ring-primary/20'
                          : ''
                      }`}
                      onClick={() => setSelectedService({
                        id: `sample-${i}`,
                        name: service.name,
                        description: service.desc,
                        session_type: 'portrait',
                        base_price: service.price,
                        duration_minutes: service.duration,
                        includes: ['Professional editing', 'Online gallery', 'Print rights']
                      })}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-xl">{service.name}</CardTitle>
                            <CardDescription className="mt-1">{service.desc}</CardDescription>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">${service.price}</div>
                            <div className="text-sm text-muted-foreground">{service.duration} min</div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {['Professional editing', 'Online gallery', 'Print rights'].map((item, j) => (
                            <li key={j} className="flex items-center gap-2 text-sm">
                              <Sparkles className="w-4 h-4 text-primary" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ))}
                </>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                size="lg"
                onClick={() => setStep(2)}
                disabled={!selectedService}
              >
                Continue
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Select Date & Time */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Pick a Date & Time</h1>
              <p className="text-muted-foreground">
                Choose when you would like to schedule your {selectedService?.name}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-primary" />
                    Select Date
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    min={minDate}
                    max={maxDateStr}
                    className="w-full"
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Select Time
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {timeSlots.map((time) => (
                      <Button
                        key={time}
                        variant={selectedTime === time ? 'default' : 'outline'}
                        onClick={() => setSelectedTime(time)}
                        className="w-full"
                      >
                        {time}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" size="lg" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back
              </Button>
              <Button
                size="lg"
                onClick={() => setStep(3)}
                disabled={!selectedDate || !selectedTime}
              >
                Continue
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Contact Details */}
        {step === 3 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Your Details</h1>
              <p className="text-muted-foreground">
                Tell us how to reach you and any special requests
              </p>
            </div>

            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Your name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Preferred Location</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Studio, outdoor, or specific venue"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Tell us about your vision, special requests, or any questions..."
                    rows={4}
                  />
                </div>

                {/* Booking Summary */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold">Booking Summary</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Service</span>
                    <span>{selectedService?.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Date</span>
                    <span>{selectedDate}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Time</span>
                    <span>{selectedTime}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Duration</span>
                    <span>{selectedService?.duration_minutes} minutes</span>
                  </div>
                  <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                    <span>Starting at</span>
                    <span className="text-primary">${selectedService?.base_price}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" size="lg" onClick={() => setStep(2)}>
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back
              </Button>
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={loading || !formData.name || !formData.email}
              >
                {loading ? 'Submitting...' : 'Submit Request'}
                <Camera className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
          <div className="text-center space-y-6 py-12">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold">Request Submitted!</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Thank you for your booking request. We will review your details and get back to you within 24 hours to confirm your session.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button onClick={() => router.push('/')}>
                Return Home
              </Button>
              <Button variant="outline" onClick={() => router.push('/gallery')}>
                View Gallery
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
