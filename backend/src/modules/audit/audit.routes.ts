import { Router } from 'express'
import { auditController } from './audit.controller'
import { authenticate, authorize } from '../../middleware/auth'

const router = Router()

// Audit log view requires System Administrator
router.get('/', authenticate, authorize('System Administrator'), auditController.getAll)
// Audit log creation requires authenticated session
router.post('/', authenticate, auditController.create)

export default router
