import { Router } from 'express'
import { attachmentsController } from './attachments.controller'

const router = Router()

router.get('/', attachmentsController.getAll)

export default router

