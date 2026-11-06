import type { Response, NextFunction } from 'express'
import type { AuthenticatedRequest, UserRole } from './auth'

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ): void => {
    if (!req.user) {
      res.status(401).json({ message: 'Authentication required.' })
      return
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role))
    if (!hasRole) {
      res.status(403).json({
        message: `Access denied for roles: ${req.user.roles.join(', ')}.`,
      })
      return
    }

    next()
  }
}
