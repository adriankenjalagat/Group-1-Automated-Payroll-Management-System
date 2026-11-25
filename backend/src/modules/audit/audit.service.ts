import { pool } from '../../config/db'

export interface AuditRecord {
  logId: number
  userId: number | null
  action: string
  loggedAt: string
  username: string
  name: string
  role: string
  details?: Record<string, unknown> | null
  ipAddress?: string | null
}

export const auditService = {
  async findAll(): Promise<AuditRecord[]> {
    try {
      const res = await pool.query(
        `SELECT
           a.id AS log_id,
           a.user_id,
           a.action,
           a.entity_type,
           a.entity_id,
           a.new_values AS details,
           a.ip_address,
           a.created_at AS logged_at,
           COALESCE(u.username, 'system') AS username,
           COALESCE(
             NULLIF(TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)), ''),
             u.username,
             'System Administrator'
           ) AS name,
           COALESCE(u.role, 'System Administrator') AS role
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         LEFT JOIN employees e ON e.id = u.employee_id
         ORDER BY a.created_at DESC, a.id DESC`,
      )
      return res.rows.map((row: any) => ({
        logId: Number(row.log_id),
        userId: row.user_id ? Number(row.user_id) : null,
        action: (row.details && typeof row.details === 'object' && row.details.message)
          ? String(row.details.message)
          : row.action,
        loggedAt: row.logged_at ? new Date(row.logged_at).toISOString() : new Date().toISOString(),
        username: row.username,
        name: row.name,
        role: row.role,
        details: row.details,
        ipAddress: row.ip_address,
      }))
    } catch (err) {
      console.warn('[DB auditService] findAll error:', err)
      return []
    }
  },

  async logAction(
    userId: number | null,
    action: string,
    details?: Record<string, unknown> | null,
    ipAddress?: string | null,
    entityType = 'SYSTEM',
    entityId = 0,
  ): Promise<void> {
    try {
      let resolvedUserId = userId
      if (!resolvedUserId) {
        const fallback = await pool.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`)
        if (fallback.rows.length === 0) return
        resolvedUserId = Number(fallback.rows[0].id)
      }

      const shortAction = action.slice(0, 100)
      const payload = {
        ...(details || {}),
        ...(action.length > 100 ? { message: action } : {}),
      }

      const inferredEntityId =
        entityId ||
        Number((details as any)?.targetUserId) ||
        Number((details as any)?.employeeId) ||
        Number((details as any)?.payrollId) ||
        Number((details as any)?.attendanceId) ||
        0

      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, CURRENT_TIMESTAMP)`,
        [
          resolvedUserId,
          shortAction,
          entityType.slice(0, 100),
          Number.isFinite(inferredEntityId) ? inferredEntityId : 0,
          JSON.stringify(payload),
          ipAddress ? ipAddress.slice(0, 45) : null,
        ],
      )
    } catch (err) {
      console.warn('[DB auditService] logAction error:', err)
    }
  },
}
