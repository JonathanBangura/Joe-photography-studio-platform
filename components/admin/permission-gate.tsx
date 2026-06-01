'use client'

import { usePathname } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { StudioRole } from '@/lib/types'
import {
  canPerformActionSync,
  getModuleFromPath,
  type PermissionAction,
  type RolePermission,
} from '@/lib/permissions'

interface PermissionGateProps {
  children: React.ReactNode
  role: StudioRole
  permissions: RolePermission[]
  loading?: boolean
  action?: PermissionAction
}

export function PermissionGate({
  children,
  role,
  permissions,
  loading = false,
  action = 'can_access',
}: PermissionGateProps) {
  const pathname = usePathname()
  const module = getModuleFromPath(pathname)

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const allowed = canPerformActionSync(permissions, role, module, action)

  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access restricted</CardTitle>
            <CardDescription>
              Your current role does not have permission to access this section.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
