"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar, Clock, MapPin, Camera, FileText, CreditCard } from "lucide-react"

// Mock data
const mockBookings = [
  {
    id: "1",
    service_name: "Wedding Photography",
    booking_date: "2024-03-15",
    start_time: "10:00",
    end_time: "20:00",
    location: "Grand Ballroom, Ritz Carlton",
    status: "confirmed",
    total_amount: 2500,
    payment_status: "paid",
    notes: "Full day coverage with second photographer",
  },
  {
    id: "2",
    service_name: "Engagement Session",
    booking_date: "2024-02-28",
    start_time: "16:00",
    end_time: "18:00",
    location: "Central Park, NYC",
    status: "completed",
    total_amount: 350,
    payment_status: "paid",
    notes: "Sunset session near the lake",
  },
  {
    id: "3",
    service_name: "Family Portrait",
    booking_date: "2024-04-10",
    start_time: "14:00",
    end_time: "15:30",
    location: "Joe Studio",
    status: "pending",
    total_amount: 450,
    payment_status: "pending",
    notes: "Family of 5 with pet",
  },
]

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  confirmed: "bg-green-500/20 text-green-400 border-green-500/30",
  completed: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
}

const paymentStatusStyles: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  paid: "bg-green-500/20 text-green-400 border-green-500/30",
  partial: "bg-blue-500/20 text-blue-400 border-blue-500/30",
}

export default function PortalBookingsPage() {
  const upcomingBookings = mockBookings.filter(b => 
    b.status !== "completed" && b.status !== "cancelled"
  )
  const pastBookings = mockBookings.filter(b => 
    b.status === "completed" || b.status === "cancelled"
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Bookings</h1>
          <p className="text-muted-foreground">View your upcoming and past sessions</p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Book New Session
        </Button>
      </div>

      {/* Upcoming Bookings */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Upcoming Sessions</h2>
        {upcomingBookings.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No upcoming sessions scheduled</p>
              <Button className="mt-4">Book a Session</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {upcomingBookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Date Badge */}
                    <div className="bg-primary/10 p-6 flex flex-col items-center justify-center md:w-32">
                      <span className="text-3xl font-bold text-primary">
                        {new Date(booking.booking_date).getDate()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(booking.booking_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    </div>
                    
                    {/* Booking Details */}
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-lg">{booking.service_name}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {booking.start_time} - {booking.end_time}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {booking.location}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusStyles[booking.status]} variant="outline">
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                          <Badge className={paymentStatusStyles[booking.payment_status]} variant="outline">
                            {booking.payment_status === "paid" ? "Paid" : "Payment Due"}
                          </Badge>
                        </div>
                      </div>
                      
                      {booking.notes && (
                        <p className="text-sm text-muted-foreground mb-4">{booking.notes}</p>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t">
                        <span className="font-semibold text-lg">
                          ${booking.total_amount.toLocaleString()}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            <FileText className="mr-2 h-4 w-4" />
                            View Contract
                          </Button>
                          {booking.payment_status !== "paid" && (
                            <Button size="sm">
                              <CreditCard className="mr-2 h-4 w-4" />
                              Pay Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Past Bookings */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Past Sessions</h2>
        {pastBookings.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">No past sessions yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {pastBookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden opacity-75 hover:opacity-100 transition-opacity">
                <CardContent className="p-0">
                  <div className="flex flex-col md:flex-row">
                    {/* Date Badge */}
                    <div className="bg-muted p-6 flex flex-col items-center justify-center md:w-32">
                      <span className="text-3xl font-bold">
                        {new Date(booking.booking_date).getDate()}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(booking.booking_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                      </span>
                    </div>
                    
                    {/* Booking Details */}
                    <div className="flex-1 p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{booking.service_name}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-4 w-4" />
                              {booking.location}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={statusStyles[booking.status]} variant="outline">
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                          <Button variant="outline" size="sm">
                            <Camera className="mr-2 h-4 w-4" />
                            View Gallery
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
