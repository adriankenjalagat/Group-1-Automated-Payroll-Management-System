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

function mapDtrRow(row: any): AttendanceRecord {
  const verified = Boolean(row.verified_at || row.verified_by)
  const hours = Number(row.hours_worked) || 0
  return {
    id: Number(row.id),
    employeeId: row.employee_no || String(row.employee_id),
    employeeName: row.full_name || '',
    department: row.office_name || '',
    period: row.period_label || (row.work_date ? new Date(row.work_date).toISOString().slice(0, 7) : 'November 2026'),
    daysWorked: row.is_absent ? 0 : Math.max(1, Math.round((hours / 8) * 100) / 100),
    absences: row.is_absent ? 1 : 0,
    hoursWorked: hours,
    latenessMinutes: Number(row.late_minutes) || 0,
    undertimeMinutes: Number(row.undertime_minutes) || 0,
    verifiedBySupervisor: verified,
    status: verified ? 'Verified' : 'Pending',
    verifiedAt: row.verified_at ? new Date(row.verified_at).toISOString() : undefined,
    concerns: [],
  }
}

export const attendanceService = {
  async getState(): Promise<AttendanceModuleState> {
    const res = await pool.query(
      `SELECT d.*,
              e.employee_no,
              TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS full_name,
              COALESCE(o.name, 'General Administration') AS office_name,
              di.period_label
       FROM dtr_records d
       JOIN employees e ON e.id = d.employee_id
       LEFT JOIN LATERAL (
         SELECT office_id FROM appointments WHERE employee_id = e.id ORDER BY effective_from DESC, id DESC LIMIT 1
       ) a ON TRUE
       LEFT JOIN offices o ON o.id = a.office_id
       LEFT JOIN dtr_imports di ON di.id = d.import_id
       ORDER BY d.id DESC`,
    )

    const allRecords = res.rows.map(mapDtrRow)
    const approvedRecords = allRecords.filter((r) => r.verifiedBySupervisor || r.status === 'Verified')

    return {
      records: allRecords,
      concerns: [],
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
        if (!rec.employeeId) continue
        await attendanceService.recordAttendance(
          rec.employeeId,
          {
            period: rec.period || 'November 2026',
            daysWorked: rec.daysWorked || 0,
            absences: rec.absences || 0,
            hoursWorked: rec.hoursWorked,
            latenessMinutes: rec.latenessMinutes,
            undertimeMinutes: rec.undertimeMinutes,
            verified: rec.verifiedBySupervisor,
            remarks: rec.supervisorRemarks,
          },
          actingUserId,
          ip,
        ).catch(() => {})
      }
    }

    await auditService.logAction(
      actingUserId || null,
      'Updated attendance module state and records',
      { recordCount: partial.records?.length },
      ip || null,
      'DTR_RECORD',
      0,
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
      `SELECT e.id, e.employee_no,
              TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS full_name,
              COALESCE(o.name, 'General Administration') AS office_name
       FROM employees e
       LEFT JOIN LATERAL (
         SELECT office_id FROM appointments WHERE employee_id = e.id ORDER BY effective_from DESC, id DESC LIMIT 1
       ) a ON TRUE
       LEFT JOIN offices o ON o.id = a.office_id
       WHERE e.employee_no = $1 OR (e.id::text = $1 AND $1 ~ '^[0-9]+$')
       LIMIT 1`,
      [String(employeeId)],
    )

    if (empRes.rows.length === 0) {
      throw new Error(`Employee ${employeeId} not found.`)
    }

    const emp = empRes.rows[0]
    const hoursWorked = data.hoursWorked ?? (data.daysWorked || 0) * 8
    const isAbsent = (data.absences || 0) > 0 && (data.daysWorked || 0) === 0

    const insertRes = await pool.query(
      `INSERT INTO dtr_records (
         employee_id, work_date, late_minutes, undertime_minutes,
         is_absent, hours_worked, entry_source, verified_by, verified_at
       ) VALUES (
         $1, CURRENT_DATE, $2, $3,
         $4, $5, 'MANUAL',
         CASE WHEN $6 THEN $7::bigint ELSE NULL END,
         CASE WHEN $6 THEN CURRENT_TIMESTAMP ELSE NULL END
       ) RETURNING *`,
      [
        emp.id,
        data.latenessMinutes || 0,
        data.undertimeMinutes || 0,
        isAbsent,
        hoursWorked,
        Boolean(data.verified),
        actingUserId || null,
      ],
    )

    await auditService.logAction(
      actingUserId || null,
      `Recorded DTR attendance for ${emp.full_name} (${emp.employee_no}) - Period: ${data.period}`,
      { employeeNo: emp.employee_no, period: data.period, daysWorked: data.daysWorked, absences: data.absences },
      ip || null,
      'DTR_RECORD',
      Number(insertRes.rows[0].id),
    )

    return mapDtrRow({
      ...insertRes.rows[0],
      employee_no: emp.employee_no,
      full_name: emp.full_name,
      office_name: emp.office_name,
      period_label: data.period,
    })
  },

  async verifyAttendance(
    id: number,
    remarks?: string,
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<AttendanceRecord | undefined> {
    const res = await pool.query(
      `UPDATE dtr_records
       SET verified_by = $1,
           verified_at = CURRENT_TIMESTAMP
       WHERE id = $2
       RETURNING *`,
      [actingUserId || null, id],
    )

    if (res.rows.length === 0) return undefined

    const row = res.rows[0]
    const empRes = await pool.query(
      `SELECT e.employee_no,
              TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS full_name,
              COALESCE(o.name, 'General Administration') AS office_name
       FROM employees e
       LEFT JOIN LATERAL (
         SELECT office_id FROM appointments WHERE employee_id = e.id ORDER BY effective_from DESC, id DESC LIMIT 1
       ) a ON TRUE
       LEFT JOIN offices o ON o.id = a.office_id
       WHERE e.id = $1`,
      [row.employee_id],
    )
    const emp = empRes.rows[0] || {}

    await auditService.logAction(
      actingUserId || null,
      `Verified attendance record #${id} for employee ${emp.full_name || row.employee_id}`,
      { attendanceId: id, remarks },
      ip || null,
      'DTR_RECORD',
      id,
    )

    return mapDtrRow({ ...row, ...emp })
  },

  async resolveConcern(
    concernId: string,
    resolution: any,
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<boolean> {
    const numericId = parseInt(concernId, 10)
    if (isNaN(numericId)) return false

    const res = await pool.query(
      `UPDATE dtr_records SET verified_by = $1, verified_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id`,
      [actingUserId || null, numericId],
    )
    if (res.rows.length === 0) return false

    await auditService.logAction(
      actingUserId || null,
      `Resolved attendance concern "${concernId}"`,
      { concernId, resolution },
      ip || null,
      'DTR_RECORD',
      numericId,
    )
    return true
  },
}
