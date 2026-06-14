'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle, ArrowRight, ArrowLeft, Camera, CreditCard, AlertCircle, Lock, Check, X } from 'lucide-react'

interface Service {
  id: string
  name: string
  description: string | null
  session_type?: string | null
  base_price: number
  duration_minutes: number
  includes?: string[] | null
}

interface StudioResource {
  id: string
  name: string
  type: 'indoor' | 'outdoor' | 'event' | 'desk'
  capacity: number
  available: boolean
  reason?: string
}

interface SlotAvailability {
  available: boolean
  reason?: string
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

export function BookingForm({ services, clientInfo }: BookingFormProps) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [checkingSlots, setCheckingSlots] = useState(false)
  const [bookingReference, setBookingReference] = useState<string | null>(null)
  const [paymentLink, setPaymentLink] = useState<string | null>(null)

  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')

  const [bookingEnvironment, setBookingEnvironment] = useState<'indoor' | 'outdoor' | 'event'>('indoor')
  const [privacyLevel, setPrivacyLevel] = useState<'shared' | 'private'>('shared')

  const [resourceId, setResourceId] = useState('')
  const [resources, setResources] = useState<StudioResource[]>([])
  const [slotAvailability, setSlotAvailability] = useState<Record<string, SlotAvailability>>({})

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
    [totalAmount, depositPercentage],
  )

  const balanceAmount = useMemo(
    () => Number((totalAmount - depositAmount).toFixed(2)),
    [totalAmount, depositAmount],
  )

  const selectedResource = resources.find((resource) => resource.id === resourceId)
  const availableResources = resources.filter((resource) => resource.available)

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  const maxDate = new Date()
  maxDate.setMonth(maxDate.getMonth() + 3)
  const maxDateStr = maxDate.toISOString().split('T')[0]

  useEffect(() => {
    if (bookingEnvironment !== 'indoor') {
      setPrivacyLevel('shared')
    }
  }, [bookingEnvironment])

  useEffect(() => {
    setResourceId('')
    setResources([])
  }, [bookingEnvironment, privacyLevel, selectedService?.id, selectedDate, selectedTime])

  useEffect(() => {
    async function loadSlotAvailability() {
      if (!selectedService?.id || !selectedDate) {
        setSlotAvailability({})
        return
      }

      setCheckingSlots(true)

      const availabilityMap: Record<string, SlotAvailability> = {}

      for (const slot of timeSlots) {
        try {
          const params = new URLSearchParams({
            service_id: selectedService.id,
            date: selectedDate,
            start_time: slot,
            booking_environment: bookingEnvironment,
            privacy_level: privacyLevel,
          })

          const response = await fetch(`/api/availability?${params.toString()}`)
          const result = await response.json()

          if (!response.ok) {
            availabilityMap[slot] = {
              available: false,
              reason: result.error || 'Unavailable',
            }
            continue
          }

          const hasAvailableResource = Array.isArray(result.resources)
            ? result.resources.some((resource: StudioResource) => resource.available)
            : false

          availabilityMap[slot] = {
            available: hasAvailableResource,
            reason: hasAvailableResource
              ? 'Available'
              : result.reason || 'No studio resource available',
          }
        } catch {
          availabilityMap[slot] = {
            available: false,
            reason: 'Unable to check slot',
          }
        }
      }

      setSlotAvailability(availabilityMap)
      setCheckingSlots(false)
    }

    loadSlotAvailability()
  }, [selectedDate, selectedService?.id, bookingEnvironment, privacyLevel])

  useEffect(() => {
    async function checkAvailability() {
      if (!selectedService?.id || !selectedDate || !selectedTime) return

      setCheckingAvailability(true)
      setErrorMessage(null)

      try {
        const params = new URLSearchParams({
          service_id: selectedService.id,
          date: selectedDate,
          start_time: selectedTime,
          booking_environment: bookingEnvironment,
          privacy_level: privacyLevel,
        })

        const response = await fetch(`/api/availability?${params.toString()}`)
        const result = await response.json()

        if (!response.ok) throw new Error(result.error || 'Unable to check availability')

        setResources(result.resources || [])
      } catch (error) {
        setResources([])
        setErrorMessage(error instanceof Error ? error.message : 'Unable to check availability')
      } finally {
        setCheckingAvailability(false)
      }
    }

    checkAvailability()
  }, [selectedService?.id, selectedDate, selectedTime, bookingEnvironment, privacyLevel])

  const validateStep = () => {
    setErrorMessage(null)

    if (step === 1 && !selectedService) {
      setErrorMessage('Please select a package first.')
      return false
    }

    if (step === 2 && (!selectedDate || !selectedTime || !bookingEnvironment || !privacyLevel || !resourceId)) {
      setErrorMessage('Please select date, time, booking type and an available resource.')
      return false
    }

    if (step === 2 && slotAvailability[selectedTime] && !slotAvailability[selectedTime].available) {
      setErrorMessage(slotAvailability[selectedTime].reason || 'Selected time is not available.')
      return false
    }

    if (step === 2 && selectedResource && !selectedResource.available) {
      setErrorMessage(selectedResource.reason || 'Selected resource is not available.')
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
          booking_environment: bookingEnvironment,
          privacy_level: privacyLevel,
          resource_id: resourceId,
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location || (bookingEnvironment === 'outdoor' ? 'Outdoor' : 'Studio'),
          notes: formData.notes,
          deposit_percentage: Number(depositPercentage),
          deposit_paid_amount: 0,
          profile_id: clientInfo?.profile?.id || null,
        }),
      })

      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Booking failed')

      setBookingReference(result.booking?.booking_reference || result.booking?.id || null)
      setPaymentLink(result.payment_link?.url || null)
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
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
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
                  className={`cursor-pointer transition-all hover:border-primary ${selectedService?.id === service.id ? 'border-primary ring-2 ring-primary/20' : ''}`}
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
              <CardTitle>Select Date, Time & Studio Resource</CardTitle>
              <CardDescription>
                The studio assigns the photographer internally. Customers only choose session type, time and resource.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Booking Environment</Label>
                  <Select value={bookingEnvironment} onValueChange={(value) => setBookingEnvironment(value as 'indoor' | 'outdoor' | 'event')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">Indoor Studio</SelectItem>
                      <SelectItem value="outdoor">Outdoor Shoot</SelectItem>
                      <SelectItem value="event">Event Coverage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Privacy Level</Label>
                  <Select value={privacyLevel} onValueChange={(value) => setPrivacyLevel(value as 'shared' | 'private')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="shared">Shared Resource</SelectItem>
                      <SelectItem value="private" disabled={bookingEnvironment !== 'indoor'}>
                        Private Indoor Studio Lock
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {bookingEnvironment === 'indoor' && privacyLevel === 'private' && (
                <div className="flex gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
                  <Lock className="mt-0.5 h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-semibold text-amber-800">Private Indoor Studio Reservation</p>
                    <p className="text-amber-700">
                      This reserves the full indoor studio for your session. No other indoor booking will be accepted during this time.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Preferred Date</Label>
                <Input
                  type="date"
                  min={minDate}
                  max={maxDateStr}
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value)
                    setSelectedTime('')
                    setResourceId('')
                  }}
                />
              </div>

              <div className="space-y-3">
                <Label>Available Time Slots</Label>

                {!selectedDate && (
                  <p className="text-sm text-muted-foreground">
                    Select a date first to check available time slots.
                  </p>
                )}

                {selectedDate && checkingSlots && (
                  <p className="text-sm text-muted-foreground">
                    Checking available slots...
                  </p>
                )}

                {selectedDate && (
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {timeSlots.map((slot) => {
                      const status = slotAvailability[slot]
                      const isAvailable = Boolean(status?.available)
                      const isSelected = selectedTime === slot

                      return (
                        <Button
                          key={slot}
                          type="button"
                          variant={isSelected ? 'default' : isAvailable ? 'outline' : 'secondary'}
                          disabled={!isAvailable || checkingSlots}
                          onClick={() => {
                            setSelectedTime(slot)
                            setResourceId('')
                          }}
                          className="flex items-center justify-between gap-2"
                        >
                          <span>{slot}</span>
                          {isAvailable ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </Button>
                      )
                    })}
                  </div>
                )}

                {selectedTime && slotAvailability[selectedTime]?.reason && (
                  <p className="text-xs text-muted-foreground">
                    {slotAvailability[selectedTime].reason}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Available Resource</Label>
                <Select
                  value={resourceId}
                  onValueChange={setResourceId}
                  disabled={!selectedDate || !selectedTime || checkingAvailability}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={checkingAvailability ? 'Checking availability...' : 'Select available resource'} />
                  </SelectTrigger>
                  <SelectContent>
                    {resources.map((resource) => (
                      <SelectItem key={resource.id} value={resource.id} disabled={!resource.available}>
                        {resource.name} {resource.available ? '' : `— ${resource.reason || 'Unavailable'}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedDate && selectedTime && !checkingAvailability && availableResources.length === 0 && (
                  <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700">
                    <AlertCircle className="h-4 w-4 mt-0.5" />
                    <p>No resource is available for this time. Try another time or contact the studio.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                <Button onClick={goNext} disabled={!resourceId || checkingAvailability}>
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Your Details</CardTitle>
              <CardDescription>
                No account is required. We will use these details to contact you about the booking.
              </CardDescription>
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
                <Input
                  placeholder="Studio or event address"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Special Requests</Label>
                <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                <Button onClick={goNext}>
                  Review Booking <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && selectedService && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Deposit Requirement</CardTitle>
              <CardDescription>
                Your booking will be saved as pending until the studio confirms and deposit is paid.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex justify-between">
                  <span>Package</span>
                  <strong>{selectedService.name}</strong>
                </div>

                <div className="flex justify-between">
                  <span>Date & Time</span>
                  <strong>{selectedDate} at {selectedTime}</strong>
                </div>

                <div className="flex justify-between">
                  <span>Booking Type</span>
                  <strong className="capitalize">{privacyLevel} {bookingEnvironment}</strong>
                </div>

                <div className="flex justify-between">
                  <span>Resource</span>
                  <strong>{selectedResource?.name}</strong>
                </div>

                <div className="flex justify-between">
                  <span>Photographer</span>
                  <strong>Assigned by studio</strong>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Deposit Requirement</Label>

                <Select value={depositPercentage} onValueChange={(value) => setDepositPercentage(value as '30' | '50')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30% Deposit</SelectItem>
                    <SelectItem value="50">50% Deposit</SelectItem>
                  </SelectContent>
                </Select>

                <div className="rounded-lg border p-4 space-y-2">
                  <div className="flex justify-between">
                    <span>Total Session Fee</span>
                    <strong>${totalAmount.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Deposit Required</span>
                    <strong>${depositAmount.toLocaleString()}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Balance Due</span>
                    <strong>${balanceAmount.toLocaleString()}</strong>
                  </div>
                </div>

                <div className="rounded-lg bg-primary/10 p-4 flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <p className="text-sm">
                    The studio will confirm availability and send payment instructions for the required deposit.
                  </p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(3)}>
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Booking Request'}
                </Button>
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
                You can pay your deposit or balance using your secure payment link. The link can also be emailed or shared by WhatsApp.
              </p>

              {paymentLink && (
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button asChild>
                    <a href={paymentLink}>Pay Deposit / Balance Now</a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentLink)
                    }}
                  >
                    Copy Payment Link
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}