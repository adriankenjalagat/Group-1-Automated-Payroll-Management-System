import { Router } from 'express'
import { disbursementController } from './disbursement.controller'

const router = Router()

router.get('/', disbursementController.getAll)

export default router

