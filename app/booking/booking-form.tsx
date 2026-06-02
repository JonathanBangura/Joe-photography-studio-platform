'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, ArrowRight, ArrowLeft, Camera, CreditCard } from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string | null
  session_type?: string | null
  base_price: number
  duration_minutes: number
  includes?: string[] | null
}

interface BookingFormProps {
  services: Service[]
  availability: Array<{ day_of_week: number; start_time: string; end_time: string }>
  blockedDates: string[]
  clientInfo: {
    profile: { id?: string; full_name: string | null; email: string | null; phone: string | null } | null
    client: { id?: string; address: string | null; city: string | null } | null
  } | null
  isLoggedIn: boolean
}

export function BookingForm({ services, clientInfo, isLoggedIn }: BookingFormProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [bookingReference, setBookingReference] = useState<string | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [depositPercentage, setDepositPercentage] = useState<'30' | '50'>('50')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: clientInfo?.profile?.full_name || '',
    email: clientInfo?.profile?.email || '',
    phone: clientInfo?.profile?.phone || '',
    location: clientInfo?.client?.address || '',
    notes: '',
  })

  const timeSlots = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

  const totalAmount = Number(selectedService?.base_price || 0)
  const depositAmount = useMemo(
    () => Number(((totalAmount * Number(depositPercentage)) / 100).toFixed(2)),
    [totalAmount, depositPercentage]
  )

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 3)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  const validateStep = () => {
    setErrorMessage(null)
    if (step === 1 && !selectedService) {
      setErrorMessage('Please select a package first.')
      return false
    }
    if (step === 2 && (!selectedDate || !selectedTime)) {
      setErrorMessage('Please select your preferred date and time.')
      return false
    }
    if (step === 3 && (!formData.name || (!formData.email && !formData.phone))) {
      setErrorMessage('Please enter your name and at least one contact method: email or phone.')
      return false
    }
    return true
  }

  const goNext = () => {
    if (validateStep()) setStep((current) => Math.min(current + 1, 4))
  }

  const handleSubmit = async () => {
    if (!validateStep() || !selectedService) return

    setLoading(true)
    setErrorMessage(null)

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_source: 'online',
          service_id: selectedService.id,
          booking_date: selectedDate,
          start_time: selectedTime,
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location || 'Studio',
          notes: formData.notes,
          deposit_percentage: Number(depositPercentage),
          deposit_paid_amount: 0,
          profile_id: clientInfo?.profile?.id || null,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Booking failed')

      setBookingReference(result.booking?.booking_reference || result.booking?.id || null)
      setStep(5)
    } catch (error) {
      console.error('Booking error:', error)
      setErrorMessage(error instanceof Error ? error.message : 'Unable to create booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[80vh] py-20">
      <div className="container max-w-4xl mx-auto px-4">
        {step < 5 && (
          <div className="flex items-center justify-center mb-12">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                    step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                {s < 4 && <div className={`w-12 md:w-20 h-1 mx-2 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
              </div>
            ))}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {errorMessage}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-8">
            <div className="text-center">
              <h1 className="text-3xl md:text-4xl font-bold mb-4">Choose Your Package</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Select a photography package. You can submit your booking without creating an account.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {services.map((service) => (
                <Card
                  key={service.id}
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedService?.id === service.id ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                  onClick={() => setSelectedService(service)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>{service.name}</CardTitle>
                        <CardDescription className="mt-1">{service.description}</CardDescription>
                      </div>
                      <div className="text-2xl font-bold text-primary">${service.base_price}</div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Camera className="w-4 h-4" />
                      {service.duration_minutes} minutes
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end">
              <Button onClick={goNext} disabled={!selectedService}>
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Date & Time</CardTitle>
              <CardDescription>Choose your preferred session date and time.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Preferred Date</Label>
                  <Input
                    type="date"
                    min={minDate}
                    max={maxDateStr}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preferred Time</Label>
                  <Select value={selectedTime} onValueChange={setSelectedTime}>
                    <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                    <SelectContent>
                      {timeSlots.map((time) => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={goNext}>Continue <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
              <CardDescription>No account is required. We will use these details to contact you about the booking.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input placeholder="Studio or event address" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Special Requests</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={goNext}>Review Booking <ArrowRight className="w-4 h-4 ml-2" /></Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && selectedService && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Deposit Requirement</CardTitle>
              <CardDescription>Your booking will be saved as pending until the studio confirms and deposit is paid.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between"><span>Package</span><strong>{selectedService.name}</strong></div>
                <div className="flex justify-between"><span>Date & Time</span><strong>{selectedDate} at {selectedTime}</strong></div>
                <div className="flex justify-between"><span>Total Amount</span><strong>${totalAmount.toLocaleString()}</strong></div>
              </div>

              <div className="space-y-2">
                <Label>Deposit Requirement</Label>
                <Select value={depositPercentage} onValueChange={(value) => setDepositPercentage(value as '30' | '50')}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30% Deposit</SelectItem>
                    <SelectItem value="50">50% Deposit</SelectItem>
                  </SelectContent>
                </Select>
                <div className="rounded-lg bg-primary/10 p-4 flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <p className="text-sm">
                    Deposit required: <strong>${depositAmount.toLocaleString()}</strong>. The studio will confirm availability and send payment instructions.
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Submitting...' : 'Submit Booking Request'}</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 5 && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <CardTitle>Booking Request Submitted</CardTitle>
              <CardDescription>
                Your booking has been sent to the studio and will appear on the admin dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {bookingReference && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">Booking Reference</p>
                  <p className="text-2xl font-bold text-primary">{bookingReference}</p>
                </div>
              )}
              <p className="text-muted-foreground">
                We will contact you to confirm availability and complete the deposit payment.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
