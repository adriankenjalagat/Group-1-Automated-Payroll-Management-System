import { Router } from 'express'
import { attachmentsController } from './attachments.controller'
import { authenticate, authorize } from '../../middleware/auth'
import { upload } from '../../middleware/upload'

const router = Router()

// All submissions/attachments require authentication
router.use(authenticate)

router.get('/', attachmentsController.getAll)
router.get('/:id', attachmentsController.getById)
router.post('/', attachmentsController.create)
router.put(
  '/:id',
  authorize('Immediate Supervisor', 'HR Office', 'System Administrator'),
  attachmentsController.update,
)

// Physical file upload endpoint
router.post('/upload', upload.single('file'), attachmentsController.uploadFile)

// File download endpoint
router.get('/:id/download', attachmentsController.downloadFile)

export default router
