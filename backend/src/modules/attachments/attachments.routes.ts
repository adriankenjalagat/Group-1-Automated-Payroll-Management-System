import { Router } from 'express'
import { attachmentsController } from './attachments.controller'

const router = Router()

router.get('/', attachmentsController.getAll)
router.get('/:id', attachmentsController.getById)
router.post('/', attachmentsController.create)
router.put('/:id', attachmentsController.update)

export default router
