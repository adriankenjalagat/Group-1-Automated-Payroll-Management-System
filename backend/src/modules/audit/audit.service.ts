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
           a.log_id,
           a.user_id,
           a.action,
           a.logged_at,
           a.details,
           a.ip_address,
           COALESCE(u.username, 'system') AS username,
           COALESCE(u.name, u.username, 'System Administrator') AS name,
           COALESCE(u.roles[1], 'System Administrator') AS role
         FROM audit_logs a
         LEFT JOIN users u ON a.user_id = u.id
         ORDER BY a.logged_at DESC, a.log_id DESC`,
      )
      return res.rows.map((row: any) => ({
        logId: row.log_id,
        userId: row.user_id,
        action: row.action,
        loggedAt: row.logged_at,
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
  ): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, details, ip_address, logged_at) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
        [userId, action, details ? JSON.stringify(details) : null, ipAddress || null],
      )
    } catch (err) {
      console.warn('[DB auditService] logAction error:', err)
    }
  },
}
