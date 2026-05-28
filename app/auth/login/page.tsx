'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    if (data.user) {
      // Check user role to redirect appropriately
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      toast.success('Welcome back!')
      
      if (profile?.role === 'admin' || profile?.role === 'staff') {
        router.push('/admin')
      } else {
        router.push('/portal')
      }
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight">
              Joe<span className="text-primary">Studio</span>
            </span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to access your account and manage your sessions.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/auth/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Sign up link */}
          <p className="text-center text-sm text-muted-foreground mt-8">
            Don&apos;t have an account?{' '}
            <Link href="/auth/sign-up" className="text-primary hover:underline font-medium">
              Create an account
            </Link>
          </p>
        </div>
      </div>

      {/* Right side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1452587925148-ce544e77e70d?q=80&w=1974&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/40 to-transparent" />
        <div className="absolute bottom-12 left-12 right-12">
          <blockquote className="text-xl font-serif italic text-foreground/90">
            &quot;Photography is the story I fail to put into words.&quot;
          </blockquote>
          <p className="text-sm text-muted-foreground mt-4">- Destin Sparks</p>
        </div>
      </div>
    </div>
  )
}
