"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit2, Trash2, DollarSign, Clock, Camera } from "lucide-react"

// Mock data - will be replaced with Supabase data
const mockServices = [
  { id: "1", name: "Wedding Photography", session_type: "wedding", base_price: 2500, duration_minutes: 600, is_active: true, includes: ["Full day coverage", "Second photographer", "500+ photos"] },
  { id: "2", name: "Portrait Session", session_type: "portrait", base_price: 350, duration_minutes: 120, is_active: true, includes: ["1-2 hour session", "30+ edited images", "Print release"] },
  { id: "3", name: "Corporate Headshots", session_type: "corporate", base_price: 250, duration_minutes: 30, is_active: true, includes: ["30-minute session", "5 retouched images", "Quick turnaround"] },
  { id: "4", name: "Family Session", session_type: "family", base_price: 450, duration_minutes: 90, is_active: true, includes: ["1.5 hour session", "40+ images", "Location choice"] },
  { id: "5", name: "Event Coverage", session_type: "event", base_price: 800, duration_minutes: 240, is_active: false, includes: ["4 hours coverage", "200+ images", "Online gallery"] },
]

const sessionTypes = [
  { value: "portrait", label: "Portrait" },
  { value: "wedding", label: "Wedding" },
  { value: "event", label: "Event" },
  { value: "corporate", label: "Corporate" },
  { value: "product", label: "Product" },
  { value: "family", label: "Family" },
  { value: "maternity", label: "Maternity" },
  { value: "newborn", label: "Newborn" },
  { value: "other", label: "Other" },
]

export default function AdminServicesPage() {
  const [services, setServices] = useState(mockServices)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingService, setEditingService] = useState<typeof mockServices[0] | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    session_type: "",
    base_price: "",
    duration_minutes: "",
    description: "",
    includes: "",
  })

  const handleOpenDialog = (service?: typeof mockServices[0]) => {
    if (service) {
      setEditingService(service)
      setFormData({
        name: service.name,
        session_type: service.session_type,
        base_price: service.base_price.toString(),
        duration_minutes: service.duration_minutes.toString(),
        description: "",
        includes: service.includes.join("\n"),
      })
    } else {
      setEditingService(null)
      setFormData({
        name: "",
        session_type: "",
        base_price: "",
        duration_minutes: "",
        description: "",
        includes: "",
      })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In production, this would save to Supabase
    setIsDialogOpen(false)
  }

  const toggleServiceStatus = (id: string) => {
    setServices(services.map(s => 
      s.id === id ? { ...s, is_active: !s.is_active } : s
    ))
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Services & Packages</h1>
          <p className="text-muted-foreground">Manage your photography services and pricing</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Add Service
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingService ? "Edit Service" : "Add New Service"}</DialogTitle>
              <DialogDescription>
                {editingService ? "Update the service details below" : "Fill in the details to create a new service package"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Service Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Wedding Photography"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="session_type">Session Type</Label>
                  <Select
                    value={formData.session_type}
                    onValueChange={(value) => setFormData({ ...formData, session_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="base_price">Base Price ($)</Label>
                  <Input
                    id="base_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.base_price}
                    onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (minutes)</Label>
                  <Input
                    id="duration"
                    type="number"
                    min="0"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    placeholder="60"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe this service package..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="includes">What&apos;s Included (one per line)</Label>
                <Textarea
                  id="includes"
                  value={formData.includes}
                  onChange={(e) => setFormData({ ...formData, includes: e.target.value })}
                  placeholder="Full day coverage&#10;Second photographer&#10;500+ edited images"
                  rows={4}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingService ? "Update Service" : "Create Service"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{services.length}</div>
            <p className="text-xs text-muted-foreground">{services.filter(s => s.is_active).length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(services.reduce((acc, s) => acc + s.base_price, 0) / services.length).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">per service</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(Math.round(services.reduce((acc, s) => acc + s.duration_minutes, 0) / services.length))}
            </div>
            <p className="text-xs text-muted-foreground">per session</p>
          </CardContent>
        </Card>
      </div>

      {/* Services Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Services</CardTitle>
          <CardDescription>A list of all your photography services and packages</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell className="font-medium">{service.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {service.session_type}
                    </Badge>
                  </TableCell>
                  <TableCell>${service.base_price.toLocaleString()}</TableCell>
                  <TableCell>{formatDuration(service.duration_minutes)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={service.is_active}
                        onCheckedChange={() => toggleServiceStatus(service.id)}
                      />
                      <span className={service.is_active ? "text-green-500" : "text-muted-foreground"}>
                        {service.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(service)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
