import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

type BookingEnvironment = 'indoor' | 'outdoor' | 'event'
type PrivacyLevel = 'shared' | 'private'

type ExistingBooking = {
  id: string
  resource_id: string | null
  staff_id: string | null
  booking_environment: BookingEnvironment | null
  privacy_level: PrivacyLevel | null
  locks_indoor_studio: boolean | null
  studio_resources?: { id: string; name: string; type: string } | null
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(':').map(Number)
  const date = new Date(2000, 0, 1, hours || 0, mins || 0)
  date.setMinutes(date.getMinutes() + minutes)
  return date.toTimeString().slice(0, 5)
}

function normalizeEnvironment(value: string | null): BookingEnvironment {
  return value === 'outdoor' || value === 'event' ? value : 'indoor'
}

function normalizePrivacy(value: string | null): PrivacyLevel {
  return value === 'private' ? 'private' : 'shared'
}

function isIndoorLike(booking: ExistingBooking) {
  return booking.booking_environment === 'indoor' || booking.studio_resources?.type === 'indoor' || booking.studio_resources?.type === 'desk'
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const supabase = createAdminClient()

    const bookingDate = searchParams.get('date') || ''
    const startTime = searchParams.get('start_time') || ''
    const serviceId = searchParams.get('service_id') || ''
    const staffId = searchParams.get('staff_id') || ''
    const bookingEnvironment = normalizeEnvironment(searchParams.get('booking_environment'))
    const privacyLevel = normalizePrivacy(searchParams.get('privacy_level'))

    if (!bookingDate || !startTime || !serviceId) {
      return NextResponse.json({ error: 'date, start_time and service_id are required.' }, { status: 400 })
    }

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, duration_minutes')
      .eq('id', serviceId)
      .single()

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Selected service/package was not found.' }, { status: 404 })
    }

    const endTime = addMinutes(startTime, Number(service.duration_minutes || 60))

    const { data: resources, error: resourcesError } = await supabase
      .from('studio_resources')
      .select('*')
      .eq('is_active', true)
      .order('type')
      .order('name')

    if (resourcesError) throw resourcesError

    const { data: overlapping, error: bookingError } = await supabase
      .from('bookings')
      .select('id, resource_id, staff_id, booking_environment, privacy_level, locks_indoor_studio, studio_resources(id, name, type)')
      .eq('booking_date', bookingDate)
      .not('status', 'eq', 'cancelled')
      .lt('start_time', endTime)
      .gt('end_time', startTime)

    if (bookingError) throw bookingError

    const existing = (overlapping || []) as ExistingBooking[]
    const existingPrivateIndoorLock = existing.find((booking) => booking.locks_indoor_studio && isIndoorLike(booking))
    const staffConflict = staffId ? existing.find((booking) => booking.staff_id === staffId) : null

    const availableResources = (resources || []).map((resource) => {
      const resourceType = String(resource.type)
      const resourceIsIndoor = resourceType === 'indoor' || resourceType === 'desk'
      const sameResourceCount = existing.filter((booking) => booking.resource_id === resource.id).length
      const capacity = Number(resource.capacity || 1)
      let available = true
      let reason = ''

      if (bookingEnvironment === 'indoor' && !resourceIsIndoor) {
        available = false
        reason = 'This booking requires an indoor studio resource.'
      }

      if (bookingEnvironment === 'outdoor' && resourceType !== 'outdoor') {
        available = false
        reason = 'This booking requires an outdoor resource.'
      }

      if (bookingEnvironment === 'event' && resourceType !== 'event') {
        available = false
        reason = 'This booking requires an event coverage resource.'
      }

      if (available && bookingEnvironment === 'indoor' && privacyLevel === 'private') {
        const anyIndoorConflict = existing.find(isIndoorLike)
        if (anyIndoorConflict) {
          available = false
          reason = 'Private indoor session requires the whole indoor studio, but an indoor booking already exists.'
        }
      }

      if (available && resourceIsIndoor && existingPrivateIndoorLock) {
        available = false
        reason = 'Indoor studio is locked by a private indoor session during this time.'
      }

      if (available && sameResourceCount >= capacity) {
        available = false
        reason = `${resource.name} is fully booked during this time.`
      }

      return {
        ...resource,
        available,
        reason,
        overlapping_count: sameResourceCount,
      }
    })

    return NextResponse.json({
      date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      booking_environment: bookingEnvironment,
      privacy_level: privacyLevel,
      staff_available: !staffConflict,
      staff_conflict_reason: staffConflict ? 'Selected photographer/staff member already has another booking at this time.' : null,
      resources: availableResources,
    })
  } catch (error) {
    console.error('Availability API error:', error)
    const message = error instanceof Error ? error.message : 'Unable to check availability'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
