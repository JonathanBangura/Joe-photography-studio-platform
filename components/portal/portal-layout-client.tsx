'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Camera,
  LayoutDashboard,
  Calendar,
  Image,
  FileText,
  CreditCard,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const navItems = [
  { href: '/portal', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/portal/bookings', icon: Calendar, label: 'My Bookings' },
  { href: '/portal/galleries', icon: Image, label: 'My Galleries' },
  { href: '/portal/contracts', icon: FileText, label: 'Contracts' },
  { href: '/portal/invoices', icon: CreditCard, label: 'Invoices' },
  { href: '/portal/settings', icon: Settings, label: 'Settings' },
]

interface PortalLayoutClientProps {
  children: React.ReactNode
  user: {
    email: string
    full_name?: string | null
    avatar_url?: string | null
  }
}

export function PortalLayoutClient({ children, user }: PortalLayoutClientProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Signed out successfully')
    router.push('/auth/login')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/portal" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Camera className="w-5 h-5 text-primary" />
              </div>
              <span className="font-serif text-lg font-semibold">
                Joe<span className="text-primary">Studio</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/portal' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={user.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user.full_name?.charAt(0) || user.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{user.full_name || 'Client'}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/portal/settings">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/">
                      <Camera className="w-4 h-4 mr-2" />
                      View Website
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {/* Mobile Nav */}
          {mobileMenuOpen && (
            <nav className="md:hidden pb-4 border-t border-border pt-4 animate-fade-in">
              <div className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/portal' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                      )}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
