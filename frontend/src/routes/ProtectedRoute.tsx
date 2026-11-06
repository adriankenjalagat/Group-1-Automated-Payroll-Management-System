import type { ReactNode } from 'react'
import type { MockUser, Role } from '../auth/mockData'

export type { MockUser, Role }

interface ProtectedRouteProps {
  user: MockUser | null
  allowedRoles?: Role[]
  fallback?: ReactNode
  children: ReactNode
}

export function ProtectedRoute({
  user,
  allowedRoles,
  fallback = null,
  children,
}: ProtectedRouteProps) {
  if (!user || user.status !== 'active') {
    return <>{fallback}</>
  }

  if (
    allowedRoles &&
    !user.roles.some((assignedRole) => allowedRoles.includes(assignedRole))
  ) {
    return (
      <div className="mx-auto max-w-md rounded-card bg-surface p-8 text-center text-text shadow-card">
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="mt-2 text-text-muted">
          Your assigned role ({user.roles.join(', ')}) does not have permission
          to view this workspace.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
