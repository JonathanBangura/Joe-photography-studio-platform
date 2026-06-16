'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { adminDbMutation } from '@/lib/admin-api-client'
import { toast } from 'sonner'
import {
  Package,
  Search,
  Plus,
  MoreHorizontal,
  Camera,
  Wrench,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Calendar,
  DollarSign,
  MapPin,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface EquipmentCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
}

interface Equipment {
  id: string
  category_id: string | null
  name: string
  description: string | null
  serial_number: string | null
  purchase_date: string | null
  purchase_price: number | null
  current_value: number | null
  condition: 'excellent' | 'good' | 'fair' | 'poor' | 'needs_repair'
  status: 'available' | 'in_use' | 'maintenance' | 'retired'
  location: string | null
  assigned_to: string | null
  last_maintenance_date: string | null
  next_maintenance_date: string | null
  warranty_expiry: string | null
  notes: string | null
  image_url: string | null
  created_at: string
  category?: EquipmentCategory
}

interface MaintenanceLog {
  id: string
  equipment_id: string
  maintenance_type: string
  description: string | null
  cost: number | null
  performed_by: string | null
  maintenance_date: string
  next_due_date: string | null
  created_at: string
}

const conditionColors: Record<string, string> = {
  excellent: 'bg-green-500/10 text-green-500 border-green-500/20',
  good: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  fair: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  poor: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  needs_repair: 'bg-red-500/10 text-red-500 border-red-500/20',
}

const statusColors: Record<string, string> = {
  available: 'bg-green-500/10 text-green-500 border-green-500/20',
  in_use: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  maintenance: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  retired: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([])
  const [categories, setCategories] = useState<EquipmentCategory[]>([])
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false)
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null)
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    category_id: '',
    description: '',
    serial_number: '',
    purchase_date: '',
    purchase_price: '',
    current_value: '',
    condition: 'good',
    status: 'available',
    location: '',
    warranty_expiry: '',
    notes: '',
  })
  const [newMaintenance, setNewMaintenance] = useState({
    maintenance_type: '',
    description: '',
    cost: '',
    performed_by: '',
    maintenance_date: new Date().toISOString().split('T')[0],
    next_due_date: '',
  })
  const supabase = createClient()

  useEffect(() => {
    fetchEquipment()
    fetchCategories()
  }, [])

  const fetchEquipment = async () => {
    const { data, error } = await supabase
      .from('equipment')
      .select('*, category:equipment_categories(*)')
      .order('name')

    if (error) {
      toast.error('Failed to load equipment')
      console.error(error)
    } else {
      setEquipment(data || [])
    }
    setLoading(false)
  }

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('equipment_categories')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) {
      console.error(error)
    } else {
      setCategories(data || [])
    }
  }

  const fetchMaintenanceLogs = async (equipmentId: string) => {
    const { data, error } = await supabase
      .from('equipment_maintenance')
      .select('*')
      .eq('equipment_id', equipmentId)
      .order('maintenance_date', { ascending: false })

    if (error) {
      console.error(error)
    } else {
      setMaintenanceLogs(data || [])
    }
  }

  const handleAddEquipment = async () => {
    if (!newEquipment.name) {
      toast.error('Please enter equipment name')
      return
    }

    try {
      await adminDbMutation({
        table: 'equipment',
        action: 'insert',
        payload: {
          name: newEquipment.name,
          category_id: newEquipment.category_id || null,
          description: newEquipment.description || null,
          serial_number: newEquipment.serial_number || null,
          purchase_date: newEquipment.purchase_date || null,
          purchase_price: newEquipment.purchase_price ? parseFloat(newEquipment.purchase_price) : null,
          current_value: newEquipment.current_value ? parseFloat(newEquipment.current_value) : null,
          condition: newEquipment.condition,
          status: newEquipment.status,
          location: newEquipment.location || null,
          warranty_expiry: newEquipment.warranty_expiry || null,
          notes: newEquipment.notes || null,
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add equipment')
      console.error(error)
      return
    }

      toast.success('Equipment added successfully')
      setAddDialogOpen(false)
      setNewEquipment({
        name: '',
        category_id: '',
        description: '',
        serial_number: '',
        purchase_date: '',
        purchase_price: '',
        current_value: '',
        condition: 'good',
        status: 'available',
        location: '',
        warranty_expiry: '',
        notes: '',
      })
      fetchEquipment()
  }

  const handleAddMaintenance = async () => {
    if (!selectedEquipment || !newMaintenance.maintenance_type || !newMaintenance.maintenance_date) {
      toast.error('Please fill in required fields')
      return
    }

    try {
      await adminDbMutation({
        table: 'equipment_maintenance',
        action: 'insert',
        payload: {
          equipment_id: selectedEquipment.id,
          maintenance_type: newMaintenance.maintenance_type,
          description: newMaintenance.description || null,
          cost: newMaintenance.cost ? parseFloat(newMaintenance.cost) : null,
          performed_by: newMaintenance.performed_by || null,
          maintenance_date: newMaintenance.maintenance_date,
          next_due_date: newMaintenance.next_due_date || null,
        },
      })

      await adminDbMutation({
        table: 'equipment',
        action: 'update',
        id: selectedEquipment.id,
        payload: {
          last_maintenance_date: newMaintenance.maintenance_date,
          next_maintenance_date: newMaintenance.next_due_date || null,
        },
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to log maintenance')
      console.error(error)
      return
    }

    toast.success('Maintenance logged')
      setMaintenanceDialogOpen(false)
      setNewMaintenance({
        maintenance_type: '',
        description: '',
        cost: '',
        performed_by: '',
        maintenance_date: new Date().toISOString().split('T')[0],
        next_due_date: '',
      })
    fetchEquipment()
  }

  const updateEquipmentStatus = async (id: string, status: string) => {
    try {
      await adminDbMutation({
        table: 'equipment',
        action: 'update',
        id,
        payload: { status },
      })
      toast.success('Status updated')
      fetchEquipment()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update status')
    }
  }

  const deleteEquipment = async (id: string) => {
    try {
      await adminDbMutation({
        table: 'equipment',
        action: 'delete',
        id,
      })
      toast.success('Equipment deleted')
      fetchEquipment()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete equipment')
    }
  }

  const filteredEquipment = equipment.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.serial_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.location?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesCategory = categoryFilter === 'all' || item.category_id === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  const stats = {
    total: equipment.length,
    available: equipment.filter((e) => e.status === 'available').length,
    inUse: equipment.filter((e) => e.status === 'in_use').length,
    maintenance: equipment.filter((e) => e.status === 'maintenance').length,
    totalValue: equipment.reduce((sum, e) => sum + (e.current_value || e.purchase_price || 0), 0),
    needsMaintenance: equipment.filter((e) => {
      if (!e.next_maintenance_date) return false
      return new Date(e.next_maintenance_date) <= new Date()
    }).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Equipment Inventory</h1>
          <p className="text-muted-foreground">Manage and track all studio equipment</p>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Equipment
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.available}</p>
                <p className="text-xs text-muted-foreground">Available</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Camera className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inUse}</p>
                <p className="text-xs text-muted-foreground">In Use</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Wrench className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.maintenance}</p>
                <p className="text-xs text-muted-foreground">Maintenance</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <DollarSign className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">${stats.totalValue.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Value</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.needsMaintenance}</p>
                <p className="text-xs text-muted-foreground">Due Service</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="in_use">In Use</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Equipment Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Equipment Inventory</CardTitle>
          <CardDescription>{filteredEquipment.length} items found</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipment</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Serial</TableHead>
                <TableHead>Condition</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEquipment.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Package className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {item.description && (
                          <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {item.category?.name || <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {item.serial_number || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={conditionColors[item.condition]}>
                      {item.condition.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[item.status]}>
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.location ? (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        {item.location}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {item.current_value || item.purchase_price
                      ? `$${(item.current_value || item.purchase_price)?.toLocaleString()}`
                      : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedEquipment(item)
                            fetchMaintenanceLogs(item.id)
                            setMaintenanceDialogOpen(true)
                          }}
                        >
                          <Wrench className="w-4 h-4 mr-2" />
                          Log Maintenance
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => updateEquipmentStatus(item.id, 'available')}>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark Available
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateEquipmentStatus(item.id, 'in_use')}>
                          <Camera className="w-4 h-4 mr-2" />
                          Mark In Use
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateEquipmentStatus(item.id, 'maintenance')}>
                          <Wrench className="w-4 h-4 mr-2" />
                          Send to Maintenance
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => deleteEquipment(item.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Equipment Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Equipment</DialogTitle>
            <DialogDescription>Add new equipment to your inventory</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-2">
              <Label>Name *</Label>
              <Input
                value={newEquipment.name}
                onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                placeholder="Equipment name"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newEquipment.category_id}
                onValueChange={(value) => setNewEquipment({ ...newEquipment, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input
                value={newEquipment.serial_number}
                onChange={(e) => setNewEquipment({ ...newEquipment, serial_number: e.target.value })}
                placeholder="S/N"
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={newEquipment.purchase_date}
                onChange={(e) => setNewEquipment({ ...newEquipment, purchase_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Price</Label>
              <Input
                type="number"
                step="0.01"
                value={newEquipment.purchase_price}
                onChange={(e) => setNewEquipment({ ...newEquipment, purchase_price: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Current Value</Label>
              <Input
                type="number"
                step="0.01"
                value={newEquipment.current_value}
                onChange={(e) => setNewEquipment({ ...newEquipment, current_value: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={newEquipment.location}
                onChange={(e) => setNewEquipment({ ...newEquipment, location: e.target.value })}
                placeholder="Storage location"
              />
            </div>
            <div className="space-y-2">
              <Label>Condition</Label>
              <Select
                value={newEquipment.condition}
                onValueChange={(value) => setNewEquipment({ ...newEquipment, condition: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excellent">Excellent</SelectItem>
                  <SelectItem value="good">Good</SelectItem>
                  <SelectItem value="fair">Fair</SelectItem>
                  <SelectItem value="poor">Poor</SelectItem>
                  <SelectItem value="needs_repair">Needs Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Warranty Expiry</Label>
              <Input
                type="date"
                value={newEquipment.warranty_expiry}
                onChange={(e) => setNewEquipment({ ...newEquipment, warranty_expiry: e.target.value })}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newEquipment.description}
                onChange={(e) => setNewEquipment({ ...newEquipment, description: e.target.value })}
                placeholder="Equipment description..."
                rows={2}
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={newEquipment.notes}
                onChange={(e) => setNewEquipment({ ...newEquipment, notes: e.target.value })}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddEquipment}>Add Equipment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Maintenance Dialog */}
      <Dialog open={maintenanceDialogOpen} onOpenChange={setMaintenanceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Maintenance</DialogTitle>
            <DialogDescription>
              Record maintenance for {selectedEquipment?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Maintenance Type *</Label>
              <Select
                value={newMaintenance.maintenance_type}
                onValueChange={(value) =>
                  setNewMaintenance({ ...newMaintenance, maintenance_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cleaning">Cleaning</SelectItem>
                  <SelectItem value="repair">Repair</SelectItem>
                  <SelectItem value="calibration">Calibration</SelectItem>
                  <SelectItem value="inspection">Inspection</SelectItem>
                  <SelectItem value="replacement">Part Replacement</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date *</Label>
              <Input
                type="date"
                value={newMaintenance.maintenance_date}
                onChange={(e) =>
                  setNewMaintenance({ ...newMaintenance, maintenance_date: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Cost</Label>
              <Input
                type="number"
                step="0.01"
                value={newMaintenance.cost}
                onChange={(e) => setNewMaintenance({ ...newMaintenance, cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Performed By</Label>
              <Input
                value={newMaintenance.performed_by}
                onChange={(e) =>
                  setNewMaintenance({ ...newMaintenance, performed_by: e.target.value })
                }
                placeholder="Technician name"
              />
            </div>
            <div className="space-y-2">
              <Label>Next Service Due</Label>
              <Input
                type="date"
                value={newMaintenance.next_due_date}
                onChange={(e) =>
                  setNewMaintenance({ ...newMaintenance, next_due_date: e.target.value })
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newMaintenance.description}
                onChange={(e) =>
                  setNewMaintenance({ ...newMaintenance, description: e.target.value })
                }
                placeholder="Describe the maintenance performed..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaintenanceDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMaintenance}>Log Maintenance</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
