'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Camera, Loader2, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback?redirect_to=/auth/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo,
    })

    setIsLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    setSent(true)
    toast.success('Password reset link sent.')
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
            <h1 className="font-serif text-3xl font-bold mb-2">Reset your password</h1>
            <p className="text-muted-foreground">
              Enter your email address and we will send you a secure password reset link.
            </p>
          </div>

          {sent ? (
            <div className="space-y-6">
              <div className="rounded-xl border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h2 className="font-semibold">Check your email</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  If an account exists for {email}, a reset link has been sent. Check your inbox and spam folder.
                </p>
              </div>

              <Button asChild variant="outline" className="w-full">
                <Link href="/auth/login">Back to Sign In</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                    Sending link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link href="/auth/login" className="font-medium text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1964&auto=format&fit=crop')`,
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/50 to-transparent" />
      </div>
    </div>
  )
}
