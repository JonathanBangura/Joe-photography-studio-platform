import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function overlaps(
  startA: string,
  endA: string,
  startB: string,
  endB: string,
) {
  const aStart = timeToMinutes(startA)
  const aEnd = timeToMinutes(endA)

  const bStart = timeToMinutes(startB)
  const bEnd = timeToMinutes(endB)

  return aStart < bEnd && bStart < aEnd
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const body = await request.json()

    const {
      booking_date,
      start_time,
      end_time,
      resource_id,
      staff_id,
      booking_environment,
      privacy_level,
      booking_id,
    } = body

    if (!booking_date || !start_time || !end_time) {
      return NextResponse.json(
        {
          available: false,
          reason: 'Missing booking date or time',
        },
        { status: 400 },
      )
    }

    const { data: existingBookings, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('booking_date', booking_date)
      .neq('status', 'cancelled')

    if (error) {
      throw error
    }

    const activeBookings =
      existingBookings?.filter((booking) =>
        booking_id ? booking.id !== booking_id : true,
      ) || []

    // =====================================================
    // PRIVATE INDOOR STUDIO LOCK
    // =====================================================

    if (
      booking_environment === 'indoor' &&
      privacy_level === 'private'
    ) {
      const conflictingPrivateBooking =
        activeBookings.find((booking) => {
          if (booking.booking_environment !== 'indoor') {
            return false
          }

          return overlaps(
            start_time,
            end_time,
            booking.start_time,
            booking.end_time,
          )
        })

      if (conflictingPrivateBooking) {
        return NextResponse.json({
          available: false,
          reason:
            'Indoor studio is already occupied during this time.',
        })
      }
    }

    // =====================================================
    // EXISTING PRIVATE LOCK BLOCKS NEW INDOOR BOOKINGS
    // =====================================================

    const privateLockExists = activeBookings.find((booking) => {
      if (
        booking.booking_environment !== 'indoor' ||
        !booking.locks_indoor_studio
      ) {
        return false
      }

      return overlaps(
        start_time,
        end_time,
        booking.start_time,
        booking.end_time,
      )
    })

    if (
      privateLockExists &&
      booking_environment === 'indoor'
    ) {
      return NextResponse.json({
        available: false,
        reason:
          'Indoor studio is locked by a private booking.',
      })
    }

    // =====================================================
    // RESOURCE CONFLICT
    // =====================================================

    if (resource_id) {
      const resourceConflict = activeBookings.find(
        (booking) =>
          booking.resource_id === resource_id &&
          overlaps(
            start_time,
            end_time,
            booking.start_time,
            booking.end_time,
          ),
      )

      if (resourceConflict) {
        return NextResponse.json({
          available: false,
          reason: 'Selected resource is already booked.',
        })
      }
    }

    // =====================================================
    // STAFF CONFLICT
    // =====================================================

    if (staff_id) {
      const staffConflict = activeBookings.find(
        (booking) =>
          booking.staff_id === staff_id &&
          overlaps(
            start_time,
            end_time,
            booking.start_time,
            booking.end_time,
          ),
      )

      if (staffConflict) {
        return NextResponse.json({
          available: false,
          reason:
            'Photographer is already assigned to another booking.',
        })
      }
    }

    // =====================================================
    // STAFF LEAVE CHECK
    // =====================================================

    if (staff_id) {
      const { data: leaveRequests } = await supabase
        .from('time_off_requests')
        .select('*')
        .eq('staff_id', staff_id)
        .eq('status', 'approved')

      const onLeave = leaveRequests?.some(
        (leave) =>
          booking_date >= leave.start_date &&
          booking_date <= leave.end_date,
      )

      if (onLeave) {
        return NextResponse.json({
          available: false,
          reason:
            'Selected photographer is on approved leave.',
        })
      }
    }

    // =====================================================
    // STAFF SCHEDULE CHECK
    // =====================================================

    if (staff_id) {
      const bookingDay = new Date(booking_date).getDay()

      const { data: schedules } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', staff_id)
        .eq('day_of_week', bookingDay)
        .eq('is_working', true)

      if (!schedules || schedules.length === 0) {
        return NextResponse.json({
          available: false,
          reason:
            'Photographer is not scheduled to work on this day.',
        })
      }

      const validSchedule = schedules.some((schedule) => {
        return (
          start_time >= schedule.start_time &&
          end_time <= schedule.end_time
        )
      })

      if (!validSchedule) {
        return NextResponse.json({
          available: false,
          reason:
            'Booking time falls outside photographer working hours.',
        })
      }
    }

    // =====================================================
    // SUCCESS
    // =====================================================

    return NextResponse.json({
      available: true,
      reason: 'Booking slot is available',
    })
  } catch (error) {
    console.error('Booking validation error:', error)

    return NextResponse.json(
      {
        available: false,
        reason: 'Validation failed',
      },
      { status: 500 },
    )
  }
}