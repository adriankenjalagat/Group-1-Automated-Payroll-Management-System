import type { Request, Response } from 'express'
import { attendanceService } from './attendance.service'

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

export const attendanceController = {
  getState(_req: Request, res: Response): void {
    res.status(200).json(attendanceService.getState())
  },

  updateState(req: Request, res: Response): void {
    const updated = attendanceService.updateState(req.body)
    res.status(200).json(updated)
  },

  resolveConcern(req: Request, res: Response): void {
    const id = getParam(req.params.id)
    const success = attendanceService.resolveConcern(id, req.body)
    if (!success) {
      res.status(404).json({ message: 'Concern not found.' })
      return
    }
    res.status(200).json({ message: 'Concern updated successfully.' })
  },
}
