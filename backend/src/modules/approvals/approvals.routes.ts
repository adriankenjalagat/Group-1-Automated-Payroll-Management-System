import { Router } from 'express'
import { approvalsController } from './approvals.controller'

const router = Router()

router.get('/', approvalsController.getAll)

export default router

