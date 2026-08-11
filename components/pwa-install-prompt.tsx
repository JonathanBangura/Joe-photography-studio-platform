'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { Download, Share2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
}

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean
}

const DISMISSED_AT_KEY = 'joestudio-pwa-install-dismissed-at'
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000

function wasRecentlyDismissed() {
  try {
    const dismissedAt = Number(window.localStorage.getItem(DISMISSED_AT_KEY))
    return Number.isFinite(dismissedAt) && Date.now() - dismissedAt < DISMISS_FOR_MS
  } catch {
    return false
  }
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(DISMISSED_AT_KEY, String(Date.now()))
  } catch {
    // The prompt can still be hidden for this page view when storage is unavailable.
  }
}

function isAppAlreadyInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as NavigatorWithStandalone).standalone === true
  )
}

function isIosDevice() {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent)
}

export function PWAInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [showIosInstructions, setShowIosInstructions] = useState(false)

  useEffect(() => {
    if (isAppAlreadyInstalled() || wasRecentlyDismissed()) return

    let iosTimer: ReturnType<typeof setTimeout> | undefined

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setShowIosInstructions(false)
      setShowPrompt(true)
    }

    const handleAppInstalled = () => {
      setInstallEvent(null)
      setShowPrompt(false)
      setShowIosInstructions(false)

      try {
        window.localStorage.removeItem(DISMISSED_AT_KEY)
      } catch {
        // Nothing else is required after a successful installation.
      }
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    if (isIosDevice()) {
      iosTimer = setTimeout(() => {
        setShowIosInstructions(true)
        setShowPrompt(true)
      }, 1800)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
      if (iosTimer) clearTimeout(iosTimer)
    }
  }, [])

  const dismissPrompt = () => {
    rememberDismissal()
    setShowPrompt(false)
  }

  const installApp = async () => {
    if (!installEvent) return

    await installEvent.prompt()
    const choice = await installEvent.userChoice
    setInstallEvent(null)

    if (choice.outcome === 'accepted') {
      setShowPrompt(false)
      return
    }

    dismissPrompt()
  }

  if (!showPrompt) return null

  return (
    <aside
      aria-label="Install JoeStudio"
      className="fixed inset-x-4 bottom-4 z-[100] mx-auto flex max-w-xl items-center gap-4 rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl sm:p-5"
    >
      <Image
        src="/pwa-icon-192.png"
        alt="JoeStudio app icon"
        width={64}
        height={64}
        className="size-14 shrink-0 rounded-2xl sm:size-16"
      />

      <div className="min-w-0 flex-1">
        <p className="font-semibold text-foreground sm:text-lg">Install JoeStudio</p>
        <p className="mt-0.5 text-sm leading-5 text-muted-foreground">
          {showIosInstructions
            ? 'In Safari, tap Share, then choose Add to Home Screen.'
            : 'Add JoeStudio to your home screen for quick access to bookings and galleries.'}
        </p>
      </div>

      {installEvent ? (
        <Button type="button" onClick={installApp} className="shrink-0">
          <Download aria-hidden="true" />
          <span className="hidden sm:inline">Install</span>
        </Button>
      ) : showIosInstructions ? (
        <div className="hidden shrink-0 items-center gap-1 text-sm font-medium text-primary sm:flex">
          <Share2 aria-hidden="true" className="size-4" />
          Share
        </div>
      ) : null}

      <button
        type="button"
        onClick={dismissPrompt}
        aria-label="Dismiss install prompt"
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </aside>
  )
}
