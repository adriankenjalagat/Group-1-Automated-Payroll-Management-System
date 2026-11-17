import { Router } from 'express'
import { attendanceController } from './attendance.controller'
import { authenticate, authorize } from '../../middleware/auth'

const router = Router()

// All attendance routes require authentication
router.use(authenticate)

router.get('/', attendanceController.getState)
router.post('/', authorize('HR Office', 'Immediate Supervisor', 'System Administrator'), attendanceController.record)
router.post('/state', authorize('HR Office', 'Immediate Supervisor', 'System Administrator'), attendanceController.updateState)
router.put('/:id/verify', authorize('Immediate Supervisor', 'HR Office', 'System Administrator'), attendanceController.verify)
router.put('/concerns/:id', authorize('Immediate Supervisor', 'HR Office', 'System Administrator'), attendanceController.resolveConcern)

export default router
