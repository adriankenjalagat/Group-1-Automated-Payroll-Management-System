import { Router } from 'express'
import { auditController } from './audit.controller'

const router = Router()

router.get('/', auditController.getAll)
router.post('/', auditController.create)

export default router

