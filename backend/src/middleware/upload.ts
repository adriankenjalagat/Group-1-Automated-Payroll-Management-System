import multer, { type FileFilterCallback } from 'multer'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import type { Request } from 'express'
import { storageConfig } from '../config/storage'

// Ensure upload directory exists
if (!fs.existsSync(storageConfig.uploadDir)) {
  fs.mkdirSync(storageConfig.uploadDir, { recursive: true })
}

/**
 * Generate a safe server-side filename that prevents path traversal
 * and collisions.
 */
function generateSafeFilename(originalname: string): string {
  // Strip any directory components and path traversal attempts
  const basename = path.basename(originalname).replace(/\.\./g, '')
  const ext = path.extname(basename).toLowerCase()
  const randomPart = crypto.randomBytes(8).toString('hex')
  return `${Date.now()}-${randomPart}${ext}`
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
    cb(null, storageConfig.uploadDir)
  },
  filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
    cb(null, generateSafeFilename(file.originalname))
  },
})

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  const allowedTypes: readonly string[] = storageConfig.allowedMimeTypes
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`File type "${file.mimetype}" is not allowed. Accepted types: ${allowedTypes.join(', ')}`))
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: storageConfig.maxFileSizeBytes,
  },
})

