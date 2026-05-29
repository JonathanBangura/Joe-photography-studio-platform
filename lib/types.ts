// Database types for JoeStudio Photography

// Studio Role Types
export type StudioRole =
  | 'super_admin'
  | 'studio_admin'
  | 'studio_manager'
  | 'photographer'
  | 'photo_editor'
  | 'receptionist'
  | 'finance_officer'
  | 'gallery_manager'
  | 'marketing_manager'
  | 'viewer'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  phone: string | null
  role: 'client' | 'admin' | 'staff'
  studio_role: StudioRole
  avatar_url: string | null
  is_active: boolean
  hire_date: string | null
  hourly_rate: number | null
  department: string | null
  bio: string | null
  emergency_contact: string | null
  emergency_phone: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  profile_id: string
  address: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  country: string | null
  preferred_contact: 'email' | 'phone' | 'text' | null
  referral_source: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Service {
  id: string
  name: string
  description: string | null
  category: string
  base_price: number
  duration_minutes: number | null
  deposit_amount: number | null
  is_active: boolean
  sort_order: number | null
  created_at: string
  updated_at: string
}

export interface ServiceAddon {
  id: string
  service_id: string
  name: string
  description: string | null
  price: number
  is_active: boolean
  created_at: string
}

export interface Booking {
  id: string
  client_id: string
  service_id: string
  staff_id: string | null
  booking_date: string
  start_time: string | null
  end_time: string | null
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  location: string | null
  notes: string | null
  total_amount: number | null
  deposit_paid: number | null
  deposit_paid_at: string | null
  created_at: string
  updated_at: string
}

export interface BookingAddon {
  id: string
  booking_id: string
  addon_id: string
  quantity: number
  price_at_booking: number
  created_at: string
}

export interface Contract {
  id: string
  client_id: string
  booking_id: string | null
  title: string
  content: string | null
  template_id: string | null
  status: 'draft' | 'sent' | 'signed' | 'expired'
  sent_at: string | null
  signed_at: string | null
  signature_data: string | null
  signed_ip: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  client_id: string
  booking_id: string | null
  invoice_number: string
  subtotal: number
  tax_rate: number | null
  tax_amount: number | null
  discount_amount: number | null
  total_amount: number
  amount_paid: number | null
  payment_status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled'
  due_date: string | null
  paid_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface ClientGallery {
  id: string
  client_id: string
  booking_id: string | null
  title: string
  description: string | null
  access_code: string | null
  is_public: boolean
  is_active: boolean
  download_enabled: boolean
  expires_at: string | null
  created_at: string
  updated_at: string
}

export interface ClientGalleryPhoto {
  id: string
  gallery_id: string
  file_path: string
  file_name: string
  file_size: number | null
  mime_type: string | null
  width: number | null
  height: number | null
  is_favorite: boolean
  is_downloadable: boolean
  sort_order: number | null
  created_at: string
}

export interface PortfolioCategory {
  id: string
  name: string
  slug: string
  description: string | null
  cover_image_url: string | null
  is_active: boolean
  sort_order: number | null
  created_at: string
  updated_at: string
}

export interface PortfolioPhoto {
  id: string
  category_id: string | null
  title: string | null
  description: string | null
  file_path: string
  file_name: string
  width: number | null
  height: number | null
  is_featured: boolean
  is_active: boolean
  sort_order: number | null
  created_at: string
}

export interface Testimonial {
  id: string
  client_id: string | null
  client_name: string
  client_title: string | null
  content: string
  rating: number | null
  photo_url: string | null
  is_featured: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ContactSubmission {
  id: string
  name: string
  email: string
  phone: string | null
  subject: string | null
  message: string
  service_interest: string | null
  preferred_date: string | null
  is_read: boolean
  responded_at: string | null
  created_at: string
}

export interface Availability {
  id: string
  staff_id: string | null
  day_of_week: number
  start_time: string
  end_time: string
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface BlockedDate {
  id: string
  staff_id: string | null
  blocked_date: string
  reason: string | null
  created_at: string
}

// Business Management Types

export interface Permission {
  id: string
  role: 'admin' | 'staff' | 'client'
  resource: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface ExpenseCategory {
  id: string
  name: string
  description: string | null
  color: string
  is_active: boolean
  created_at: string
}

export interface Expense {
  id: string
  category_id: string | null
  description: string
  amount: number
  expense_date: string
  vendor: string | null
  receipt_url: string | null
  payment_method: string | null
  is_reimbursable: boolean
  reimbursed_at: string | null
  notes: string | null
  created_by: string | null
  approved_by: string | null
  approved_at: string | null
  status: 'pending' | 'approved' | 'rejected' | 'reimbursed'
  created_at: string
  updated_at: string
}

export interface EquipmentCategory {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

export interface Equipment {
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
  updated_at: string
}

export interface EquipmentMaintenance {
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

export interface WorkflowStage {
  id: string
  name: string
  description: string | null
  color: string
  sort_order: number
  is_active: boolean
  created_at: string
}

export interface JobWorkflow {
  id: string
  booking_id: string
  current_stage_id: string | null
  due_date: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface JobWorkflowHistory {
  id: string
  job_workflow_id: string
  from_stage_id: string | null
  to_stage_id: string | null
  changed_by: string | null
  notes: string | null
  created_at: string
}

export interface StaffSchedule {
  id: string
  staff_id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_working: boolean
  created_at: string
  updated_at: string
}

export interface TimeOffRequest {
  id: string
  staff_id: string
  start_date: string
  end_date: string
  reason: string | null
  status: 'pending' | 'approved' | 'rejected'
  approved_by: string | null
  approved_at: string | null
  notes: string | null
  created_at: string
}

export interface RolePermission {
  id: string
  role: StudioRole
  module: string
  can_access: boolean
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  can_approve: boolean
  can_export: boolean
  can_assign_staff: boolean
  can_upload_photos: boolean
  can_publish_gallery: boolean
  can_send_invoice: boolean
  can_record_payment: boolean
  can_issue_refund: boolean
  created_at: string
  updated_at: string
}

export interface BusinessSetting {
  id: string
  key: string
  value: unknown
  description: string | null
  category: string
  created_at: string
  updated_at: string
}
