import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../middleware/auth'
import { attendanceService } from './attendance.service'

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

export const attendanceController = {
  async getState(_req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const state = await attendanceService.getState()
      res.status(200).json(state)
    } catch (err) {
      console.error('[attendanceController] getState error:', err)
      res.status(500).json({ message: 'Failed to retrieve attendance records.' })
    }
  },

  async updateState(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const updated = await attendanceService.updateState(req.body, req.user?.id, ip)
      res.status(200).json(updated)
    } catch (err) {
      console.error('[attendanceController] updateState error:', err)
      res.status(500).json({ message: 'Failed to update attendance state.' })
    }
  },

  async record(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { employeeId, period, daysWorked, absences, hoursWorked, latenessMinutes, undertimeMinutes, remarks } = req.body
      if (!employeeId || !period) {
        res.status(400).json({ message: 'Employee ID and period are required.' })
        return
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const rec = await attendanceService.recordAttendance(
        employeeId,
        {
          period,
          daysWorked: Number(daysWorked) || 0,
          absences: Number(absences) || 0,
          hoursWorked: Number(hoursWorked) || 0,
          latenessMinutes: Number(latenessMinutes) || 0,
          undertimeMinutes: Number(undertimeMinutes) || 0,
          remarks,
        },
        req.user?.id,
        ip,
      )

      res.status(201).json(rec)
    } catch (err: any) {
      console.error('[attendanceController] record error:', err)
      res.status(400).json({ message: err.message || 'Failed to record attendance.' })
    }
  },

  async verify(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = parseInt(getParam(req.params.id), 10)
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid attendance ID.' })
        return
      }

      const { remarks } = req.body as { remarks?: string }
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null

      const updated = await attendanceService.verifyAttendance(id, remarks, req.user?.id, ip)
      if (!updated) {
        res.status(404).json({ message: 'Attendance record not found.' })
        return
      }

      res.status(200).json({
        message: 'Attendance record successfully verified.',
        record: updated,
      })
    } catch (err) {
      console.error('[attendanceController] verify error:', err)
      res.status(500).json({ message: 'Failed to verify attendance.' })
    }
  },

  async resolveConcern(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = getParam(req.params.id)
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const ok = await attendanceService.resolveConcern(id, req.body, req.user?.id, ip)
      if (!ok) {
        res.status(404).json({ message: 'Concern not found.' })
        return
      }
      res.status(200).json({ message: 'Attendance concern marked resolved.' })
    } catch (err) {
      console.error('[attendanceController] resolveConcern error:', err)
      res.status(500).json({ message: 'Failed to resolve attendance concern.' })
    }
  },
}
