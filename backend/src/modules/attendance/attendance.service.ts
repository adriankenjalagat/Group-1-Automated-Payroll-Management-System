import { pool } from '../../config/db'
import { auditService } from '../audit/audit.service'

export interface AttendanceRecord {
  id: string | number
  employeeId: string
  employeeName: string
  department: string
  period: string
  daysWorked: number
  absences: number
  hoursWorked?: number
  latenessMinutes?: number
  undertimeMinutes?: number
  verifiedBySupervisor: boolean
  status: string
  supervisorRemarks?: string
  verifiedAt?: string
  concerns?: any[]
}

export interface AttendanceModuleState {
  records: AttendanceRecord[]
  concerns: any[]
  approvedRecords: AttendanceRecord[]
}

function mapAttendanceRow(row: any): AttendanceRecord {
  return {
    id: row.id,
    employeeId: row.employee_no || String(row.employee_id),
    employeeName: row.full_name || '',
    department: row.department || '',
    period: row.period,
    daysWorked: Number(row.days_worked) || 0,
    absences: Number(row.absences) || 0,
    hoursWorked: Number(row.hours_worked) || 0,
    latenessMinutes: Number(row.lateness_minutes) || 0,
    undertimeMinutes: Number(row.undertime_minutes) || 0,
    verifiedBySupervisor: Boolean(row.verified_by_supervisor),
    status: row.status || (row.verified_by_supervisor ? 'Verified' : 'Pending'),
    supervisorRemarks: row.supervisor_remarks,
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : undefined,
    concerns: Array.isArray(row.concerns) ? row.concerns : [],
  }
}

export const attendanceService = {
  async getState(): Promise<AttendanceModuleState> {
    const res = await pool.query(
      `SELECT a.*, e.employee_no, e.full_name, e.department
       FROM attendance a
       LEFT JOIN employees e ON a.employee_id = e.id
       ORDER BY a.id DESC`,
    )

    const allRecords = res.rows.map(mapAttendanceRow)
    const approvedRecords = allRecords.filter((r) => r.verifiedBySupervisor || r.status === 'Verified')
    const allConcerns: any[] = []

    allRecords.forEach((r) => {
      if (Array.isArray(r.concerns)) {
        allConcerns.push(...r.concerns)
      }
    })

    return {
      records: allRecords,
      concerns: allConcerns,
      approvedRecords,
    }
  },

  async updateState(
    partial: Partial<AttendanceModuleState>,
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<AttendanceModuleState> {
    if (partial.records && Array.isArray(partial.records)) {
      for (const rec of partial.records) {
        // Resolve employee ID
        let empId: number | null = null
        if (rec.employeeId) {
          const empRes = await pool.query(
            `SELECT id FROM employees WHERE employee_no = $1 OR (id::text = $1 AND $1 ~ '^[0-9]+$') LIMIT 1`,
            [String(rec.employeeId)],
          )
          if (empRes.rows.length > 0) {
            empId = empRes.rows[0].id
          }
        }

        if (empId) {
          await pool.query(
            `INSERT INTO attendance (
               employee_id, period, days_worked, absences, hours_worked,
               lateness_minutes, undertime_minutes, verified_by_supervisor,
               status, supervisor_remarks, concerns, created_at
             ) VALUES (
               $1, $2, $3, $4, $5,
               $6, $7, $8,
               $9, $10, $11::jsonb, CURRENT_TIMESTAMP
             )
             ON CONFLICT (id) DO UPDATE SET
               days_worked = EXCLUDED.days_worked,
               absences = EXCLUDED.absences,
               hours_worked = EXCLUDED.hours_worked,
               lateness_minutes = EXCLUDED.lateness_minutes,
               undertime_minutes = EXCLUDED.undertime_minutes,
               verified_by_supervisor = EXCLUDED.verified_by_supervisor,
               status = EXCLUDED.status,
               supervisor_remarks = EXCLUDED.supervisor_remarks,
               concerns = EXCLUDED.concerns`,
            [
              empId,
              rec.period || 'November 2026',
              rec.daysWorked || 0,
              rec.absences || 0,
              rec.hoursWorked || 0,
              rec.latenessMinutes || 0,
              rec.undertimeMinutes || 0,
              rec.verifiedBySupervisor || false,
              rec.status || 'Pending',
              rec.supervisorRemarks || null,
              JSON.stringify(rec.concerns || []),
            ],
          )
        }
      }
    }

    await auditService.logAction(
      actingUserId || null,
      'Updated attendance module state and records',
      { recordCount: partial.records?.length },
      ip || null,
    )

    return attendanceService.getState()
  },

  async recordAttendance(
    employeeId: string | number,
    data: {
      period: string
      daysWorked: number
      absences: number
      hoursWorked?: number
      latenessMinutes?: number
      undertimeMinutes?: number
      verified?: boolean
      remarks?: string
      concerns?: any[]
    },
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<AttendanceRecord> {
    const empRes = await pool.query(
      `SELECT id, employee_no, full_name, department FROM employees 
       WHERE employee_no = $1 OR (id::text = $1 AND $1 ~ '^[0-9]+$') LIMIT 1`,
      [String(employeeId)],
    )

    if (empRes.rows.length === 0) {
      throw new Error(`Employee ${employeeId} not found.`)
    }

    const emp = empRes.rows[0]

    const insertRes = await pool.query(
      `INSERT INTO attendance (
         employee_id, period, days_worked, absences, hours_worked,
         lateness_minutes, undertime_minutes, verified_by_supervisor,
         status, supervisor_remarks, concerns, created_at, verified_at, verified_by
       ) VALUES (
         $1, $2, $3, $4, $5,
         $6, $7, $8,
         $9, $10, $11::jsonb, CURRENT_TIMESTAMP,
         CASE WHEN $8 THEN CURRENT_TIMESTAMP ELSE NULL END,
         CASE WHEN $8 THEN $12::integer ELSE NULL END
       ) RETURNING *`,
      [
        emp.id,
        data.period,
        data.daysWorked || 0,
        data.absences || 0,
        data.hoursWorked || 0,
        data.latenessMinutes || 0,
        data.undertimeMinutes || 0,
        Boolean(data.verified),
        data.verified ? 'Verified' : 'Pending',
        data.remarks || null,
        JSON.stringify(data.concerns || []),
        actingUserId || null,
      ],
    )

    await auditService.logAction(
      actingUserId || null,
      `Recorded attendance for ${emp.full_name} (${emp.employee_no}) - Period: ${data.period}`,
      { employeeNo: emp.employee_no, period: data.period, daysWorked: data.daysWorked, absences: data.absences },
      ip || null,
    )

    return mapAttendanceRow({
      ...insertRes.rows[0],
      employee_no: emp.employee_no,
      full_name: emp.full_name,
      department: emp.department,
    })
  },

  async verifyAttendance(
    id: number,
    remarks?: string,
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<AttendanceRecord | undefined> {
    const res = await pool.query(
      `UPDATE attendance 
       SET verified_by_supervisor = TRUE,
           status = 'Verified',
           supervisor_remarks = COALESCE($1, supervisor_remarks),
           verified_at = CURRENT_TIMESTAMP,
           verified_by = $2
       WHERE id = $3
       RETURNING *`,
      [remarks || null, actingUserId || null, id],
    )

    if (res.rows.length === 0) return undefined

    const row = res.rows[0]
    const empRes = await pool.query(`SELECT employee_no, full_name, department FROM employees WHERE id = $1`, [row.employee_id])
    const emp = empRes.rows[0] || {}

    await auditService.logAction(
      actingUserId || null,
      `Verified attendance record #${id} for employee ${emp.full_name || row.employee_id}`,
      { attendanceId: id, remarks },
      ip || null,
    )

    return mapAttendanceRow({ ...row, ...emp })
  },

  async resolveConcern(
    concernId: string,
    resolution: any,
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<boolean> {
    // Find the attendance record that contains this concern in its JSONB array
    const findRes = await pool.query(
      `SELECT id, concerns FROM attendance
       WHERE concerns IS NOT NULL
         AND concerns::text != '[]'
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(concerns) elem
           WHERE elem->>'id' = $1
         )
       LIMIT 1`,
      [concernId],
    )

    if (findRes.rows.length === 0) {
      return false
    }

    const record = findRes.rows[0]
    const concerns: any[] = Array.isArray(record.concerns) ? record.concerns : []

    // Update the specific concern within the JSONB array
    const updatedConcerns = concerns.map((c: any) => {
      if (c.id === concernId) {
        return {
          ...c,
          resolved: true,
          resolution: resolution?.resolution || resolution?.remarks || 'Resolved',
          resolvedBy: actingUserId || null,
          resolvedAt: new Date().toISOString(),
        }
      }
      return c
    })

    // Transactionally update the JSONB column and log audit
    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      await client.query(
        `UPDATE attendance
         SET concerns = $1::jsonb
         WHERE id = $2`,
        [JSON.stringify(updatedConcerns), record.id],
      )

      await auditService.logAction(
        actingUserId || null,
        `Resolved attendance concern "${concernId}" on record #${record.id}`,
        { concernId, resolution, attendanceId: record.id },
        ip || null,
      )

      await client.query('COMMIT')
      return true
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },
}
