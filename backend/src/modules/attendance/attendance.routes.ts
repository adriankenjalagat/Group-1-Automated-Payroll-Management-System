import { Router } from 'express'
import { attendanceController } from './attendance.controller'

const router = Router()

router.get('/', attendanceController.getState)
router.post('/state', attendanceController.updateState)
router.put('/concerns/:id', attendanceController.resolveConcern)

export default router
