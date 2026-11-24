import path from 'path'
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

const SUBMISSION_SELECT_SQL = `
  SELECT
    ds.id,
    ds.submitted_at,
    ds.is_late,
    e.employee_no,
    TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS full_name,
    pp.label AS period_label,
    st.name AS status_name,
    si.file_path,
    si.remarks AS item_remarks,
    dt.name AS document_type_name,
    lv_sup.verified_at AS sup_verified_at,
    lv_sup.remarks AS sup_remarks,
    u_sup.username AS sup_username,
    lv_hr.verified_at AS hr_verified_at,
    lv_hr.remarks AS hr_remarks,
    u_hr.username AS hr_username
  FROM document_submissions ds
  JOIN employees e ON e.id = ds.employee_id
  JOIN payroll_periods pp ON pp.id = ds.period_id
  JOIN statuses st ON st.id = ds.status_id
  LEFT JOIN LATERAL (
    SELECT * FROM submission_items WHERE submission_id = ds.id ORDER BY id ASC LIMIT 1
  ) si ON TRUE
  LEFT JOIN document_types dt ON dt.id = si.document_type_id
  LEFT JOIN logbook_verifications lv_sup ON lv_sup.submission_id = ds.id AND lv_sup.verification_stage = 'SUPERVISOR'
  LEFT JOIN users u_sup ON u_sup.id = lv_sup.verified_by
  LEFT JOIN logbook_verifications lv_hr ON lv_hr.submission_id = ds.id AND lv_hr.verification_stage = 'HR'
  LEFT JOIN users u_hr ON u_hr.id = lv_hr.verified_by
`

function mapSubmissionRow(row: any): SubmissionRecord {
  const filename = row.file_path ? path.basename(row.file_path) : 'document.pdf'
  const submittedOn = row.submitted_at
    ? new Date(row.submitted_at).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0]

  return {
    id: `SUB-${row.id}`,
    employeeId: row.employee_no || '',
    employeeName: row.full_name || '',
    payrollType: 'Regular Monthly Payroll',
    period: row.period_label || 'November 2026',
    submittedOn,
    status: (row.status_name as SubmissionStatus) || 'Submitted',
    remark: row.item_remarks || undefined,
    versions: [{ version: 1, submittedOn, files: [filename] }],
    attachments: [
      {
        requirementId: 'doc-primary',
        filename,
        documentType: row.document_type_name || 'Supporting Document',
        available: Boolean(row.file_path),
        previewAvailable: Boolean(row.file_path),
        uploadedAt: row.submitted_at ? new Date(row.submitted_at).toISOString() : undefined,
      },
    ],
    supervisorValidation: row.sup_verified_at
      ? {
          supervisor: row.sup_username || 'Supervisor',
          status: 'Validated',
          validatedAt: new Date(row.sup_verified_at).toISOString(),
          remarks: row.sup_remarks || undefined,
        }
      : undefined,
    hrVerification: row.hr_verified_at
      ? {
          verifiedBy: row.hr_username || 'HR Office',
          verifiedAt: new Date(row.hr_verified_at).toISOString(),
          remarks: row.hr_remarks || undefined,
        }
      : undefined,
  }
}

function extractNumericSubmissionId(id: string): number | null {
  const clean = id.trim().replace(/^SUB-/i, '')
  const num = parseInt(clean, 10)
  return isNaN(num) ? null : num
}

export const attachmentsService = {
  async findAll(employeeId?: string): Promise<SubmissionRecord[]> {
    let queryText = SUBMISSION_SELECT_SQL
    const params: any[] = []

    if (employeeId) {
      queryText += ` WHERE e.employee_no = $1 OR (ds.employee_id::text = $1 AND $1 ~ '^[0-9]+$')`
      params.push(employeeId.trim())
    }

    queryText += ` ORDER BY ds.id DESC`

    const res = await pool.query(queryText, params)
    return res.rows.map(mapSubmissionRow)
  },

  async findById(id: string): Promise<SubmissionRecord | undefined> {
    const numId = extractNumericSubmissionId(id)
    if (numId === null) return undefined

    const res = await pool.query(`${SUBMISSION_SELECT_SQL} WHERE ds.id = $1 LIMIT 1`, [numId])
    if (res.rows.length === 0) return undefined
    return mapSubmissionRow(res.rows[0])
  },

  async create(
    data: Omit<SubmissionRecord, 'id' | 'submittedOn' | 'status'> & { id?: string; status?: SubmissionStatus },
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<SubmissionRecord> {
    const empRes = await pool.query(
      `SELECT e.id, e.employee_no,
              TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS full_name,
              a.office_id
       FROM employees e
       LEFT JOIN LATERAL (
         SELECT office_id FROM appointments WHERE employee_id = e.id ORDER BY effective_from DESC, id DESC LIMIT 1
       ) a ON TRUE
       WHERE e.employee_no = $1 OR (e.id::text = $1 AND $1 ~ '^[0-9]+$')
       LIMIT 1`,
      [String(data.employeeId)],
    )

    if (empRes.rows.length === 0) {
      throw new Error(`Employee ${data.employeeId} not found.`)
    }

    const emp = empRes.rows[0]
    const firstFilename = data.attachments?.[0]?.filename || 'document.pdf'
    const docTypeName = data.attachments?.[0]?.documentType || 'Supporting Document'
    const statusCode = (data.status || 'Submitted').toUpperCase()

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Resolve period
      let periodRes = await client.query(
        `SELECT id FROM payroll_periods WHERE LOWER(label) = LOWER($1) LIMIT 1`,
        [data.period || 'November 2026'],
      )
      let periodId: number
      if (periodRes.rows.length > 0) {
        periodId = Number(periodRes.rows[0].id)
      } else {
        const openStatus = (
          await client.query(`SELECT id FROM statuses WHERE category = 'PERIOD' AND code = 'OPEN' LIMIT 1`)
        ).rows[0].id
        const insP = await client.query(
          `INSERT INTO payroll_periods (label, period_start, period_end, submission_deadline, status_id)
           VALUES ($1, CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '25 days', $2)
           RETURNING id`,
          [data.period || 'November 2026', openStatus],
        )
        periodId = Number(insP.rows[0].id)
      }

      const officeId =
        emp.office_id ||
        Number((await client.query(`SELECT id FROM offices ORDER BY id ASC LIMIT 1`)).rows[0].id)

      const submittedBy =
        actingUserId ||
        Number((await client.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`)).rows[0].id)

      const statusRes = await client.query(
        `SELECT id FROM statuses WHERE category = 'SUBMISSION' AND UPPER(code) = $1 LIMIT 1`,
        [statusCode],
      )
      const statusId = Number(
        statusRes.rows[0]?.id ||
          (await client.query(`SELECT id FROM statuses WHERE category = 'SUBMISSION' AND code = 'SUBMITTED' LIMIT 1`))
            .rows[0].id,
      )

      const dsRes = await client.query(
        `INSERT INTO document_submissions (period_id, office_id, employee_id, submitted_by, submitted_at, is_late, status_id)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)
         RETURNING id`,
        [periodId, officeId, emp.id, submittedBy, statusCode === 'LATE', statusId],
      )
      const submissionId = Number(dsRes.rows[0].id)

      // Resolve document type
      let dtRes = await client.query(
        `SELECT id FROM document_types WHERE LOWER(name) = LOWER($1) LIMIT 1`,
        [docTypeName],
      )
      let docTypeId: number
      if (dtRes.rows.length > 0) {
        docTypeId = Number(dtRes.rows[0].id)
      } else {
        const dtIns = await client.query(
          `INSERT INTO document_types (name, is_required) VALUES ($1, FALSE) RETURNING id`,
          [docTypeName],
        )
        docTypeId = Number(dtIns.rows[0].id)
      }

      await client.query(
        `INSERT INTO submission_items (submission_id, document_type_id, file_path, is_complete, remarks)
         VALUES ($1, $2, $3, TRUE, $4)`,
        [submissionId, docTypeId, `/uploads/${firstFilename}`, data.remark || null],
      )

      await auditService.logAction(
        submittedBy,
        `Created submission SUB-${submissionId} for ${emp.full_name}`,
        { submissionId, employeeNo: emp.employee_no, status: data.status || 'Submitted' },
        ip || null,
        'DOCUMENT_SUBMISSION',
        submissionId,
      )

      await client.query('COMMIT')
      return (await attachmentsService.findById(`SUB-${submissionId}`))!
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
    const numId = extractNumericSubmissionId(id)
    if (numId === null) return undefined
    const existing = await attachmentsService.findById(id)
    if (!existing) return undefined

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      if (updateData.status) {
        const stRes = await client.query(
          `SELECT id FROM statuses WHERE category = 'SUBMISSION' AND UPPER(code) = $1 LIMIT 1`,
          [updateData.status.toUpperCase()],
        )
        if (stRes.rows.length > 0) {
          await client.query(`UPDATE document_submissions SET status_id = $1 WHERE id = $2`, [
            stRes.rows[0].id,
            numId,
          ])
        }
      }

      if (updateData.remark !== undefined) {
        await client.query(`UPDATE submission_items SET remarks = $1 WHERE submission_id = $2`, [
          updateData.remark,
          numId,
        ])
      }

      const verifierId =
        actingUserId ||
        Number((await client.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`)).rows[0].id)

      if (updateData.supervisorValidation) {
        await client.query(
          `INSERT INTO logbook_verifications (submission_id, verification_stage, verified_by, verified_at, result, remarks)
           VALUES ($1, 'SUPERVISOR', $2, CURRENT_TIMESTAMP, 'PASSED', $3)
           ON CONFLICT (submission_id, verification_stage)
           DO UPDATE SET verified_by = EXCLUDED.verified_by, verified_at = CURRENT_TIMESTAMP, result = 'PASSED', remarks = EXCLUDED.remarks`,
          [numId, verifierId, updateData.supervisorValidation.remarks || null],
        )
      }

      if (updateData.hrVerification) {
        await client.query(
          `INSERT INTO logbook_verifications (submission_id, verification_stage, verified_by, verified_at, result, remarks)
           VALUES ($1, 'HR', $2, CURRENT_TIMESTAMP, 'PASSED', $3)
           ON CONFLICT (submission_id, verification_stage)
           DO UPDATE SET verified_by = EXCLUDED.verified_by, verified_at = CURRENT_TIMESTAMP, result = 'PASSED', remarks = EXCLUDED.remarks`,
          [numId, verifierId, updateData.hrVerification.remarks || null],
        )
      }

      await auditService.logAction(
        verifierId,
        `Updated submission SUB-${numId} - Status: ${updateData.status || existing.status}`,
        { submissionId: numId, updateFields: Object.keys(updateData) },
        ip || null,
        'DOCUMENT_SUBMISSION',
        numId,
      )

      await client.query('COMMIT')
      return attachmentsService.findById(`SUB-${numId}`)
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },
}
