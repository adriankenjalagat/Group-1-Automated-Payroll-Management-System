import type { Response } from 'express'
import type { AuthenticatedRequest } from '../../middleware/auth'
import { attachmentsService } from './attachments.service'
import { pool } from '../../config/db'
import { auditService } from '../audit/audit.service'
import path from 'path'
import fs from 'fs'
import { storageConfig } from '../../config/storage'

function getParam(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] || ''
  return val || ''
}

export const attachmentsController = {
  async getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      let employeeId = req.query.employeeId as string | undefined

      // If user is Employee only, restrict query to own submissions
      if (req.user && req.user.roles.length === 1 && req.user.roles[0] === 'Employee') {
        employeeId = req.user.accountId || String(req.user.employeeId) || req.user.username
      }

      const records = await attachmentsService.findAll(employeeId)
      res.status(200).json(records)
    } catch (err) {
      console.error('[attachmentsController] getAll error:', err)
      res.status(500).json({ message: 'Failed to retrieve submissions.' })
    }
  },

  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = getParam(req.params.id)
      const record = await attachmentsService.findById(id)
      if (!record) {
        res.status(404).json({ message: 'Submission not found.' })
        return
      }

      // If employee only, verify ownership
      if (
        req.user &&
        req.user.roles.length === 1 &&
        req.user.roles[0] === 'Employee' &&
        record.employeeId !== req.user.accountId &&
        record.employeeId !== String(req.user.employeeId)
      ) {
        res.status(403).json({ message: 'Access denied: You may only view your own submission.' })
        return
      }

      res.status(200).json(record)
    } catch (err) {
      console.error('[attachmentsController] getById error:', err)
      res.status(500).json({ message: 'Failed to retrieve submission.' })
    }
  },

  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null

      // If employee submits, use their account identifier if employeeId is missing
      const empId =
        req.body.employeeId ||
        (req.user?.roles.includes('Employee') ? req.user.accountId || String(req.user.id) : undefined)

      if (!empId) {
        res.status(400).json({ message: 'Employee ID is required.' })
        return
      }

      const created = await attachmentsService.create(
        { ...req.body, employeeId: empId },
        req.user?.id,
        ip,
      )

      res.status(201).json(created)
    } catch (err: any) {
      console.error('[attachmentsController] create error:', err)
      res.status(400).json({ message: err.message || 'Failed to create submission.' })
    }
  },

  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const id = getParam(req.params.id)
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const updated = await attachmentsService.update(id, req.body, req.user?.id, ip)
      if (!updated) {
        res.status(404).json({ message: 'Submission not found.' })
        return
      }
      res.status(200).json(updated)
    } catch (err: any) {
      console.error('[attachmentsController] update error:', err)
      res.status(500).json({ message: err.message || 'Failed to update submission.' })
    }
  },

  /**
   * POST /api/attachments/upload — Upload a physical file.
   * Validates file type, size, generates safe filename, stores metadata in PostgreSQL.
   */
  async uploadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required.' })
        return
      }

      const file = req.file
      if (!file) {
        res.status(400).json({ message: 'No file was uploaded. Send a file in the "file" field.' })
        return
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || null
      const { employeeId, documentType, payrollType, period } = req.body as {
        employeeId?: string
        documentType?: string
        payrollType?: string
        period?: string
      }

      // Resolve employee
      const empId = employeeId || (req.user.roles.includes('Employee') ? String(req.user.employeeId || req.user.id) : undefined)

      let empDbId: number | null = null
      if (empId) {
        const empRes = await pool.query(
          `SELECT id FROM employees WHERE employee_no = $1 OR (id::text = $1 AND $1 ~ '^[0-9]+$') LIMIT 1`,
          [String(empId)],
        )
        if (empRes.rows.length > 0) {
          empDbId = Number(empRes.rows[0].id)
        }
      }
      if (!empDbId) {
        const firstEmp = await pool.query(`SELECT id FROM employees ORDER BY id ASC LIMIT 1`)
        empDbId = firstEmp.rows[0] ? Number(firstEmp.rows[0].id) : null
      }
      if (!empDbId) {
        res.status(400).json({ message: 'No valid employee record found for file upload.' })
        return
      }

      const created = await attachmentsService.create(
        {
          employeeId: String(empDbId),
          payrollType: payrollType || 'Regular Monthly Payroll',
          period: period || 'November 2026',
          attachments: [
            {
              requirementId: 'doc-upload',
              filename: file.filename,
              documentType: documentType || 'Supporting Document',
              available: true,
              previewAvailable: true,
            },
          ],
        },
        req.user.id,
        ip,
      )

      const numericId = parseInt(created.id.replace(/^SUB-/i, ''), 10)
      res.status(201).json({
        message: 'File uploaded successfully.',
        id: numericId,
        submissionCode: created.id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
      })
    } catch (err: any) {
      console.error('[attachmentsController] uploadFile error:', err)
      // Multer errors (file too large, wrong type)
      if (err.code === 'LIMIT_FILE_SIZE') {
        res.status(413).json({ message: `File exceeds maximum size of ${storageConfig.maxFileSizeBytes / (1024 * 1024)}MB.` })
        return
      }
      res.status(400).json({ message: err.message || 'Failed to upload file.' })
    }
  },

  /**
   * GET /api/attachments/:id/download — Download a physical file.
   * Enforces ownership checks: employee can only download own files,
   * HR/Supervisor/Admin can download any.
   */
  async downloadFile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required.' })
        return
      }

      const id = getParam(req.params.id)
      const numericId = parseInt(id.trim().replace(/^SUB-/i, ''), 10)
      if (isNaN(numericId)) {
        res.status(404).json({ message: 'Attachment not found.' })
        return
      }

      // Look up the submission and file path in the 43-table schema
      const attRes = await pool.query(
        `SELECT ds.id, ds.employee_id, e.employee_no, si.file_path
         FROM document_submissions ds
         LEFT JOIN employees e ON ds.employee_id = e.id
         LEFT JOIN LATERAL (
           SELECT file_path FROM submission_items WHERE submission_id = ds.id ORDER BY id ASC LIMIT 1
         ) si ON TRUE
         WHERE ds.id = $1
         LIMIT 1`,
        [numericId],
      )

      if (attRes.rows.length === 0) {
        res.status(404).json({ message: 'Attachment not found.' })
        return
      }

      const att = attRes.rows[0]

      // Ownership check: employee-only users can only download their own files
      const isEmployeeOnly = req.user.roles.length === 1 && req.user.roles[0] === 'Employee'
      if (isEmployeeOnly) {
        const ownsFile =
          att.employee_no === req.user.accountId ||
          String(att.employee_id) === String(req.user.employeeId) ||
          String(att.employee_id) === String(req.user.id)
        if (!ownsFile) {
          res.status(403).json({ message: 'Access denied: You may only download your own files.' })
          return
        }
      }

      // Determine the physical file path
      const storedFilename = att.file_path ? path.basename(att.file_path) : ''
      if (!storedFilename) {
        res.status(404).json({ message: 'No physical file associated with this attachment.' })
        return
      }

      const filePath = path.resolve(storageConfig.uploadDir, storedFilename)

      // Prevent path traversal
      if (!filePath.startsWith(path.resolve(storageConfig.uploadDir))) {
        res.status(403).json({ message: 'Access denied.' })
        return
      }

      if (!fs.existsSync(filePath)) {
        res.status(404).json({ message: 'Physical file not found on server.' })
        return
      }

      res.setHeader('Content-Type', 'application/octet-stream')
      res.setHeader('Content-Disposition', `attachment; filename="${storedFilename}"`)

      const fileStream = fs.createReadStream(filePath)
      fileStream.pipe(res)
    } catch (err) {
      console.error('[attachmentsController] downloadFile error:', err)
      res.status(500).json({ message: 'Failed to download file.' })
    }
  },
}
