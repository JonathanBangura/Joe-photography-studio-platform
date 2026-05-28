import Link from 'next/link'
import { Camera, CheckCircle, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SignUpSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="w-5 h-5 text-primary" />
          </div>
          <span className="font-serif text-2xl font-semibold tracking-tight">
            Joe<span className="text-primary">Studio</span>
          </span>
        </Link>

        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-8">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>

        {/* Content */}
        <h1 className="font-serif text-3xl font-bold mb-4">Check Your Email</h1>
        <p className="text-muted-foreground mb-8">
          We&apos;ve sent a confirmation link to your email address. 
          Please click the link to verify your account and complete the registration.
        </p>

        {/* Email icon */}
        <div className="flex items-center justify-center gap-3 p-4 bg-card border border-border rounded-xl mb-8">
          <Mail className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            Check your inbox and spam folder
          </span>
        </div>

        {/* Back to login */}
        <Link href="/auth/login">
          <Button variant="outline" className="w-full">
            Back to Sign In
          </Button>
        </Link>
      </div>
    </div>
  )
}
