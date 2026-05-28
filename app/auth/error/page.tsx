import Link from 'next/link'
import { Camera, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AuthErrorPage() {
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

        {/* Error Icon */}
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-8">
          <AlertCircle className="w-10 h-10 text-destructive" />
        </div>

        {/* Content */}
        <h1 className="font-serif text-3xl font-bold mb-4">Authentication Error</h1>
        <p className="text-muted-foreground mb-8">
          Something went wrong during the authentication process. 
          Please try again or contact support if the issue persists.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <Link href="/auth/login">
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              Try Again
            </Button>
          </Link>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
