"use client"

import { useState, useEffect } from "react"
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
import { Plus, Edit2, Trash2, DollarSign, Clock, Camera, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { adminDbMutation } from "@/lib/admin-api-client"
import { toast } from "sonner"

interface Service {
  id: string
  name: string
  description: string | null
  session_type: string
  base_price: number
  duration_minutes: number
  includes: string[] | null
  is_active: boolean
  created_at: string
}

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
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    session_type: "",
    base_price: "",
    duration_minutes: "",
    description: "",
    includes: "",
  })

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    setIsLoading(true)
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching services:", error)
      toast.error("Failed to load services")
    } else {
      setServices(data || [])
    }
    setIsLoading(false)
  }

  const handleOpenDialog = (service?: Service) => {
    if (service) {
      setEditingService(service)
      setFormData({
        name: service.name,
        session_type: service.session_type,
        base_price: service.base_price.toString(),
        duration_minutes: service.duration_minutes.toString(),
        description: service.description || "",
        includes: service.includes?.join("\n") || "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    
    const includesArray = formData.includes
      .split("\n")
      .map(item => item.trim())
      .filter(item => item.length > 0)

    const serviceData = {
      name: formData.name,
      session_type: formData.session_type,
      base_price: parseFloat(formData.base_price),
      duration_minutes: parseInt(formData.duration_minutes),
      description: formData.description || null,
      includes: includesArray.length > 0 ? includesArray : null,
    }

    if (editingService) {
      // Update existing service
      try {
        await adminDbMutation({
          table: "services",
          action: "update",
          id: editingService.id,
          payload: serviceData,
        })
        toast.success("Service updated successfully")
        fetchServices()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update service")
        console.error(error)
      }
    } else {
      // Create new service
      try {
        await adminDbMutation({
          table: "services",
          action: "insert",
          payload: serviceData,
        })
        toast.success("Service created successfully")
        fetchServices()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to create service")
        console.error(error)
      }
    }

    setIsSubmitting(false)
    setIsDialogOpen(false)
  }

  const toggleServiceStatus = async (id: string, currentStatus: boolean) => {
    try {
      await adminDbMutation({
        table: "services",
        action: "update",
        id,
        payload: { is_active: !currentStatus },
      })
      setServices(services.map(s => 
        s.id === id ? { ...s, is_active: !currentStatus } : s
      ))
      toast.success(`Service ${!currentStatus ? "activated" : "deactivated"}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update status")
      console.error(error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this service?")) return

    try {
      await adminDbMutation({
        table: "services",
        action: "delete",
        id,
      })
      setServices(services.filter(s => s.id !== id))
      toast.success("Service deleted successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete service")
      console.error(error)
    }
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hours`
  }

  const activeServices = services.filter(s => s.is_active)
  const avgPrice = services.length > 0 
    ? Math.round(services.reduce((acc, s) => acc + s.base_price, 0) / services.length)
    : 0
  const avgDuration = services.length > 0
    ? Math.round(services.reduce((acc, s) => acc + s.duration_minutes, 0) / services.length)
    : 0

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
                    required
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
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {editingService ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    editingService ? "Update Service" : "Create Service"
                  )}
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
            <p className="text-xs text-muted-foreground">{activeServices.length} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Average Price</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${avgPrice.toLocaleString()}</div>
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
              {avgDuration > 0 ? formatDuration(avgDuration) : "N/A"}
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
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No services yet</h3>
              <p className="text-muted-foreground mb-4">Create your first service package to get started.</p>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Add Service
              </Button>
            </div>
          ) : (
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
                          onCheckedChange={() => toggleServiceStatus(service.id, service.is_active)}
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
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => handleDelete(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
