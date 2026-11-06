import path from 'path'

export const storageConfig = {
  uploadDir: path.resolve(process.env.UPLOAD_DIR || './uploads'),
  maxFileSizeBytes: (Number(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024,
  allowedMimeTypes: [
    'application/pdf',
    'image/jpeg',
    'image/png',
  ] as const,
}

