import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../middleware/auth'
import { employeesService } from './employees.service'

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

export const employeesController = {
  async getAll(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const records = await employeesService.findAll()
      res.status(200).json(records)
    } catch (err) {
      console.error('[employeesController] getAll error:', err)
      res.status(500).json({ message: 'Failed to retrieve employees.' })
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = getParam(req.params.id)
      const employee = await employeesService.findById(id)
      if (!employee) {
        res.status(404).json({ message: 'Employee not found.' })
        return
      }

      // If user is Employee only, restrict to own record
      if (
        req.user &&
        req.user.roles.length === 1 &&
        req.user.roles[0] === 'Employee' &&
        employee.username?.toLowerCase() !== req.user.username.toLowerCase() &&
        employee.employeeId !== req.user.accountId &&
        employee.id !== req.user.employeeId
      ) {
        res.status(403).json({ message: 'Access denied: You may only view your own employee record.' })
        return
      }

      res.status(200).json(employee)
    } catch (err) {
      console.error('[employeesController] getById error:', err)
      res.status(500).json({ message: 'Failed to retrieve employee.' })
    }
  },

  async getByUsername(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const username = getParam(req.params.username)
      const employee = await employeesService.findByUsername(username)
      if (!employee) {
        res.status(404).json({ message: 'Employee not found for username.' })
        return
      }

      // If user is Employee only, restrict to own record
      if (
        req.user &&
        req.user.roles.length === 1 &&
        req.user.roles[0] === 'Employee' &&
        employee.username?.toLowerCase() !== req.user.username.toLowerCase()
      ) {
        res.status(403).json({ message: 'Access denied: You may only view your own employee record.' })
        return
      }

      res.status(200).json(employee)
    } catch (err) {
      console.error('[employeesController] getByUsername error:', err)
      res.status(500).json({ message: 'Failed to retrieve employee.' })
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const created = await employeesService.create(req.body, req.user?.id, ip)
      res.status(201).json(created)
    } catch (err: any) {
      console.error('[employeesController] create error:', err)
      const status = err.statusCode || 400
      res.status(status).json({ message: err.message || 'Failed to create employee.' })
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = getParam(req.params.id)
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const updated = await employeesService.update(id, req.body, req.user?.id, ip)
      if (!updated) {
        res.status(404).json({ message: 'Employee not found.' })
        return
      }
      res.status(200).json(updated)
    } catch (err: any) {
      console.error('[employeesController] update error:', err)
      const status = err.statusCode || 500
      res.status(status).json({ message: err.message || 'Failed to update employee.' })
    }
  },

  async delete(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = getParam(req.params.id)
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const success = await employeesService.delete(id, req.user?.id, ip)
      if (!success) {
        res.status(404).json({ message: 'Employee not found.' })
        return
      }
      res.status(200).json({ message: 'Employee deleted successfully.' })
    } catch (err: any) {
      console.error('[employeesController] delete error:', err)
      res.status(500).json({ message: 'Failed to delete employee.' })
    }
  },
}
