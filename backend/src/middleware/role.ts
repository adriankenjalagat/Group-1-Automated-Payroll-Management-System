import type { Response, NextFunction } from 'express'
import { authorize, type AuthenticatedRequest, type UserRole } from './auth'

export function authorizeRoles(...allowedRoles: UserRole[]) {
  return authorize(...allowedRoles)
}

export { authorize }
