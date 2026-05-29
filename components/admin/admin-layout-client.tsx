'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo } from 'react'
import {
  Camera,
  LayoutDashboard,
  Calendar,
  Users,
  Image,
  FileText,
  CreditCard,
  MessageSquare,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Bell,
  Search,
  UserCog,
  Shield,
  DollarSign,
  Package,
  ClipboardList,
  BarChart3,
  History,
  ChevronDown,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import type { StudioRole, RolePermission } from '@/lib/types'
import { ROLE_LABELS, type Module } from '@/lib/permissions'

type NavItem = {
  href: string
  icon: React.ElementType
  label: string
  module: Module
}

type NavSection = {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', module: 'dashboard' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { href: '/admin/bookings', icon: Calendar, label: 'Bookings', module: 'bookings' },
      { href: '/admin/jobs', icon: ClipboardList, label: 'Job Tracker', module: 'jobs' },
      { href: '/admin/clients', icon: Users, label: 'Clients', module: 'clients' },
      { href: '/admin/inquiries', icon: MessageSquare, label: 'Inquiries', module: 'inquiries' },
    ],
  },
  {
    title: 'Content',
    items: [
      { href: '/admin/gallery', icon: Image, label: 'Gallery', module: 'gallery' },
      { href: '/admin/services', icon: FileText, label: 'Services', module: 'services' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { href: '/admin/invoices', icon: CreditCard, label: 'Invoices', module: 'invoices' },
      { href: '/admin/expenses', icon: DollarSign, label: 'Expenses', module: 'expenses' },
      { href: '/admin/reports', icon: BarChart3, label: 'Reports', module: 'reports' },
    ],
  },
  {
    title: 'Resources',
    items: [
      { href: '/admin/equipment', icon: Package, label: 'Equipment', module: 'equipment' },
      { href: '/admin/staff', icon: UserCog, label: 'Staff', module: 'staff' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { href: '/admin/users', icon: Users, label: 'Users', module: 'users' },
      { href: '/admin/permissions', icon: Shield, label: 'Permissions', module: 'permissions' },
      { href: '/admin/audit-logs', icon: History, label: 'Audit Logs', module: 'audit_logs' },
      { href: '/admin/settings', icon: Settings, label: 'Settings', module: 'settings' },
    ],
  },
]

interface AdminLayoutClientProps {
  children: React.ReactNode
  user: {
    email?: string
    full_name?: string
    avatar_url?: string
    studio_role?: StudioRole
  } | null
}

const ALL_ROLES: StudioRole[] = [
  'super_admin',
  'studio_admin',
  'studio_manager',
  'photographer',
  'photo_editor',
  'receptionist',
  'finance_officer',
  'gallery_manager',
  'marketing_manager',
  'viewer',
]

export function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<string[]>(['Overview', 'Operations', 'Content', 'Finance', 'Resources', 'Administration'])
  const [permissions, setPermissions] = useState<RolePermission[]>([])
  const [previewRole, setPreviewRole] = useState<StudioRole | null>(null)
  const [isLoadingPermissions, setIsLoadingPermissions] = useState(true)

  const actualRole = user?.studio_role || 'viewer'
  const effectiveRole = previewRole || actualRole
  const isSuperAdmin = actualRole === 'super_admin'

  // Fetch permissions on mount
  useEffect(() => {
    const fetchPermissions = async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role')
        .order('module')
      
      if (!error && data) {
        setPermissions(data as RolePermission[])
      }
      setIsLoadingPermissions(false)
    }
    fetchPermissions()
  }, [])

  // Filter navigation based on permissions
  const filteredNavSections = useMemo(() => {
    if (isLoadingPermissions) return []
    
    return navSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => {
          const permission = permissions.find(
            (p) => p.role === effectiveRole && p.module === item.module
          )
          return permission?.can_access === true
        }),
      }))
      .filter((section) => section.items.length > 0)
  }, [permissions, effectiveRole, isLoadingPermissions])

  const toggleSection = (title: string) => {
    setExpandedSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title]
    )
  }

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300',
          sidebarCollapsed ? 'w-[72px]' : 'w-64',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          <Link href="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-primary/10 flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 text-sidebar-primary" />
            </div>
            {!sidebarCollapsed && (
              <span className="font-serif text-lg font-semibold text-sidebar-foreground">
                Joe<span className="text-sidebar-primary">Studio</span>
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ChevronLeft className={cn('w-5 h-5 transition-transform', sidebarCollapsed && 'rotate-180')} />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
          {filteredNavSections.map((section) => (
            <Collapsible
              key={section.title}
              open={sidebarCollapsed ? true : expandedSections.includes(section.title)}
              onOpenChange={() => !sidebarCollapsed && toggleSection(section.title)}
            >
              {!sidebarCollapsed && (
                <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/70">
                  {section.title}
                  <ChevronDown
                    className={cn(
                      'w-3 h-3 transition-transform',
                      expandedSections.includes(section.title) && 'rotate-180'
                    )}
                  />
                </CollapsibleTrigger>
              )}
              <CollapsibleContent className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                          : 'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                      )}
                    >
                      <item.icon className="w-4 h-4 shrink-0" />
                      {!sidebarCollapsed && <span>{item.label}</span>}
                    </Link>
                  )
                })}
              </CollapsibleContent>
            </Collapsible>
          ))}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors',
                  sidebarCollapsed && 'justify-center'
                )}
              >
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user?.avatar_url || ''} />
                  <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs">
                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                {!sidebarCollapsed && (
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {user?.full_name || 'Admin User'}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">
                      {user?.email}
                    </p>
                  </div>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <div className={cn('flex-1 flex flex-col transition-all duration-300', sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-64')}>
        {/* Header */}
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search..."
                className="w-64 pl-9 bg-background"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Role Preview (Super Admin only) */}
            {isSuperAdmin && (
              <div className="hidden md:flex items-center gap-2">
                <Select
                  value={previewRole || 'actual'}
                  onValueChange={(value) => setPreviewRole(value === 'actual' ? null : value as StudioRole)}
                >
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <SelectValue placeholder="Preview as role..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="actual">
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-3 h-3" />
                        My Role ({ROLE_LABELS[actualRole]})
                      </span>
                    </SelectItem>
                    <DropdownMenuSeparator />
                    {ALL_ROLES.map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {previewRole && (
                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/30">
                    Preview Mode
                  </Badge>
                )}
              </div>
            )}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
            </Button>
            <Link href="/" target="_blank">
              <Button variant="outline" size="sm">
                View Site
              </Button>
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
