'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    async function checkSession() {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setHasSession(Boolean(session))
      setCheckingSession(false)
    }

    checkSession()
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setIsLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      toast.error(error.message)
      setIsLoading(false)
      return
    }

    await supabase.auth.signOut()
    toast.success('Password updated. Please sign in with your new password.')
    router.replace('/auth/login')
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary" />
            </div>
            <span className="font-serif text-2xl font-semibold tracking-tight">
              Joe<span className="text-primary">Studio</span>
            </span>
          </Link>

          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold mb-2">Create new password</h1>
            <p className="text-muted-foreground">
              Enter a new password for your JoeStudio account.
            </p>
          </div>

          {checkingSession ? (
            <div className="flex items-center gap-3 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Checking reset link...
            </div>
          ) : !hasSession ? (
            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-6">
                <h2 className="font-semibold">Reset link expired or invalid</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Request a new password reset link and open it from the same browser.
                </p>
              </div>
              <Button asChild className="w-full">
                <Link href="/auth/forgot-password">Request New Reset Link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a new password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  className="h-12"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  'Update Password'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1520390138845-fd2d229dd553?q=80&w=1974&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/50 to-transparent" />
      </div>
    </div>
  )
}
