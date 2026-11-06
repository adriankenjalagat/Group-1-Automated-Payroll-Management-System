import type { Request, Response, NextFunction } from 'express'

export type UserRole =
  | 'Employee'
  | 'Immediate Supervisor'
  | 'HR Office'
  | 'Accounting'
  | 'Accountant'
  | 'Cost Center Signatory'
  | 'Budget Office'
  | 'Office of the Chancellor'
  | 'Cashier'
  | 'System Administrator'

export interface AuthPayload {
  username: string
  roles: UserRole[]
}

export interface AuthenticatedRequest extends Request {
  user?: AuthPayload
}

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Authentication token is required.' })
    return
  }

  const token = authHeader.slice('Bearer '.length).trim()

  if (!token) {
    res.status(401).json({ message: 'Invalid or expired token.' })
    return
  }

  req.user = {
    username: 'rbautista',
    roles: ['System Administrator'],
  }

  next()
}
