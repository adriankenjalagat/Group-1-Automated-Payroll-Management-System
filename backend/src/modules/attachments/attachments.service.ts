import { pool } from '../../config/db'
import { auditService } from '../audit/audit.service'

export type SubmissionStatus =
  | 'Submitted'
  | 'Incomplete'
  | 'Late'
  | 'Returned'
  | 'Validated'
  | 'Verified'
  | 'Transmitted'

export interface DocumentVersion {
  version: number
  submittedOn: string
  files: string[]
}

export interface VerificationAttachment {
  requirementId: string
  filename: string
  documentType: string
  available: boolean
  previewAvailable: boolean
  uploadedAt?: string
}

export interface SubmissionRecord {
  id: string
  employeeId: string
  employeeName?: string
  payrollType: string
  period: string
  submittedOn: string
  status: SubmissionStatus
  remark?: string
  returnInfo?: {
    by: string
    at: string
    remarks: string
    affected?: string
  }
  versions?: DocumentVersion[]
  resubmittedOn?: string[]
  attachments?: VerificationAttachment[]
  supervisorValidation?: {
    supervisor: string
    status: 'Validated'
    validatedAt?: string
    remarks?: string
  }
  hrVerification?: {
    verifiedBy: string
    verifiedAt: string
    remarks?: string
  }
}

function mapSubmissionRow(row: any): SubmissionRecord {
  const versions = Array.isArray(row.versions) ? row.versions : []
  const attachments = Array.isArray(row.attachments_list)
    ? row.attachments_list
    : [
        {
          requirementId: 'doc-primary',
          filename: row.file_name || 'document.pdf',
          documentType: row.document_type || 'Supporting Document',
          available: true,
          previewAvailable: true,
          uploadedAt: row.uploaded_at ? new Date(row.uploaded_at).toISOString() : undefined,
        },
      ]

  return {
    id: row.submission_code || `SUB-${row.id}`,
    employeeId: row.employee_no || String(row.employee_id),
    employeeName: row.full_name || '',
    payrollType: row.payroll_type || 'Regular Payroll',
    period: row.period || 'November 2026',
    submittedOn: row.uploaded_at
      ? new Date(row.uploaded_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    status: (row.status as SubmissionStatus) || 'Submitted',
    remark: row.remarks || undefined,
    versions: versions.length > 0 ? versions : [
      {
        version: 1,
        submittedOn: row.uploaded_at
          ? new Date(row.uploaded_at).toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0],
        files: [row.file_name || 'document.pdf'],
      },
    ],
    attachments,
    supervisorValidation: row.supervisor_validation || undefined,
    hrVerification: row.hr_verification || undefined,
  }
}

export const attachmentsService = {
  async findAll(employeeId?: string): Promise<SubmissionRecord[]> {
    let queryText = `
      SELECT a.*, e.employee_no, e.full_name
      FROM attachments a
      LEFT JOIN employees e ON a.employee_id = e.id
    `
    const params: any[] = []

    if (employeeId) {
      queryText += ` WHERE e.employee_no = $1 OR (a.employee_id::text = $1 AND $1 ~ '^[0-9]+$')`
      params.push(employeeId.trim())
    }

    queryText += ` ORDER BY a.id DESC`

    const res = await pool.query(queryText, params)
    return res.rows.map(mapSubmissionRow)
  },

  async findById(id: string): Promise<SubmissionRecord | undefined> {
    const res = await pool.query(
      `SELECT a.*, e.employee_no, e.full_name
       FROM attachments a
       LEFT JOIN employees e ON a.employee_id = e.id
       WHERE a.submission_code = $1 
          OR (a.id::text = $1 AND $1 ~ '^[0-9]+$')
       LIMIT 1`,
      [id.trim()],
    )

    if (res.rows.length === 0) return undefined
    return mapSubmissionRow(res.rows[0])
  },

  async create(
    data: Omit<SubmissionRecord, 'id' | 'submittedOn' | 'status'> & { id?: string; status?: SubmissionStatus },
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<SubmissionRecord> {
    // Resolve employee id
    const empRes = await pool.query(
      `SELECT id, employee_no, full_name FROM employees 
       WHERE employee_no = $1 OR (id::text = $1 AND $1 ~ '^[0-9]+$') LIMIT 1`,
      [String(data.employeeId)],
    )

    const empId = empRes.rows.length > 0 ? empRes.rows[0].id : null
    const empNo = empRes.rows.length > 0 ? empRes.rows[0].employee_no : data.employeeId
    const empName = empRes.rows.length > 0 ? empRes.rows[0].full_name : ''

    const subCode = data.id || `SUB-${Date.now()}`
    const firstFilename = data.attachments?.[0]?.filename || 'document.pdf'
    const docType = data.attachments?.[0]?.documentType || 'DTR / Supporting Document'
    const status = data.status || 'Submitted'

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const res = await client.query(
        `INSERT INTO attachments (
           employee_id, document_type, file_name, file_path,
           submission_code, payroll_type, period, status, remarks,
           versions, supervisor_validation, hr_verification, uploaded_at
         ) VALUES (
           $1, $2, $3, $4,
           $5, $6, $7, $8, $9,
           $10::jsonb, $11::jsonb, $12::jsonb, CURRENT_TIMESTAMP
         ) RETURNING *`,
        [
          empId,
          docType,
          firstFilename,
          `/uploads/${firstFilename}`,
          subCode,
          data.payrollType || 'Regular Monthly Payroll',
          data.period || 'November 2026',
          status,
          data.remark || null,
          JSON.stringify(data.versions || [
            {
              version: 1,
              submittedOn: new Date().toISOString().split('T')[0],
              files: (data.attachments || []).map((a) => a.filename),
            },
          ]),
          data.supervisorValidation ? JSON.stringify(data.supervisorValidation) : null,
          data.hrVerification ? JSON.stringify(data.hrVerification) : null,
        ],
      )

      await auditService.logAction(
        actingUserId || null,
        `Created submission package "${subCode}" for employee ${empName || empNo}`,
        { submissionCode: subCode, employeeNo: empNo, payrollType: data.payrollType, status },
        ip || null,
      )

      await client.query('COMMIT')
      return mapSubmissionRow({
        ...res.rows[0],
        employee_no: empNo,
        full_name: empName,
      })
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },

  async update(
    id: string,
    updateData: Partial<SubmissionRecord>,
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<SubmissionRecord | undefined> {
    const existing = await attachmentsService.findById(id)
    if (!existing) return undefined

    const updates: string[] = []
    const values: any[] = []
    let pIdx = 1

    if (updateData.status !== undefined) {
      updates.push(`status = $${pIdx++}`)
      values.push(updateData.status)
    }
    if (updateData.remark !== undefined) {
      updates.push(`remarks = $${pIdx++}`)
      values.push(updateData.remark)
    }
    if (updateData.supervisorValidation !== undefined) {
      updates.push(`supervisor_validation = $${pIdx++}::jsonb`)
      values.push(JSON.stringify(updateData.supervisorValidation))
    }
    if (updateData.hrVerification !== undefined) {
      updates.push(`hr_verification = $${pIdx++}::jsonb`)
      values.push(JSON.stringify(updateData.hrVerification))
    }
    if (updateData.versions !== undefined) {
      updates.push(`versions = $${pIdx++}::jsonb`)
      values.push(JSON.stringify(updateData.versions))
    }

    if (updates.length === 0) return existing

    values.push(existing.id)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const res = await client.query(
        `UPDATE attachments 
         SET ${updates.join(', ')} 
         WHERE submission_code = $${pIdx} OR (id::text = $${pIdx} AND $${pIdx} ~ '^[0-9]+$')
         RETURNING *`,
        values,
      )

      await auditService.logAction(
        actingUserId || null,
        `Updated submission "${existing.id}" - Status: ${updateData.status || existing.status}`,
        { submissionId: existing.id, updateFields: Object.keys(updateData) },
        ip || null,
      )

      await client.query('COMMIT')
      return attachmentsService.findById(existing.id)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },
}
