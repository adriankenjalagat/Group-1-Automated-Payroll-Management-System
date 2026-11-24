import { pool } from '../../config/db'
import { auditService } from '../audit/audit.service'
import type { UserRole } from '../../middleware/auth'

export type ApprovalStage =
  | 'Cost Center Signatory'
  | 'HR Office'
  | 'Accounting'
  | 'Budget Office'
  | 'Office of the Chancellor'

export interface ApprovalStep {
  id: number
  payrollId: number
  stage: string
  status: 'Pending' | 'Approved' | 'Rejected' | 'Returned'
  approverId?: number | null
  approverRole?: string
  approverName?: string
  costCenter?: string
  remarks?: string
  action?: string
  sequence?: number
  updatedAt: string
}

export interface ApprovalRouteRule {
  id: number
  payrollTypeId: string
  fundSource: string
  costCenter: string
  stageName: string
  sequenceOrder: number
  requiredRole: string
  isActive: boolean
}

function getAllowedRolesForStage(requiredRole: string): UserRole[] {
  const mapping: Record<string, UserRole[]> = {
    'Cost Center Signatory': ['Cost Center Signatory', 'Immediate Supervisor', 'System Administrator'],
    'HR Office': ['HR Office', 'System Administrator'],
    Accounting: ['Accounting', 'Accountant', 'System Administrator'],
    Accountant: ['Accounting', 'Accountant', 'System Administrator'],
    'Budget Office': ['Budget Office', 'System Administrator'],
    'Office of the Chancellor': ['Office of the Chancellor', 'System Administrator'],
  }
  return mapping[requiredRole] || ['System Administrator']
}

export async function getApprovalRoute(
  _payrollTypeId: string,
  _fundSource: string,
  _costCenter: string,
  clientOrPool?: any,
): Promise<ApprovalRouteRule[]> {
  const q = clientOrPool || pool
  const res = await q.query(
    `SELECT ws.id, ws.step_order, ws.step_name, r.name AS required_role
     FROM workflow_steps ws
     JOIN workflow_templates wt ON wt.id = ws.template_id
     JOIN roles r ON r.id = ws.role_id
     WHERE wt.document_type = 'PAYROLL'
     ORDER BY ws.step_order ASC`,
  )
  return res.rows.map((r: any) => ({
    id: Number(r.id),
    payrollTypeId: '*',
    fundSource: '*',
    costCenter: '*',
    stageName: r.step_name,
    sequenceOrder: Number(r.step_order),
    requiredRole: r.required_role,
    isActive: true,
  }))
}

export const approvalsService = {
  async findAll(payrollId?: number): Promise<ApprovalStep[]> {
    let queryText = `
      SELECT aa.id,
             ar.entity_id AS payroll_id,
             ws.step_name AS stage,
             ws.step_order AS sequence,
             aa.action,
             aa.acted_by AS approver_id,
             r.name AS approver_role,
             COALESCE(
               NULLIF(TRIM(CONCAT_WS(' ', e.first_name, e.last_name)), ''),
               u.username
             ) AS approver_name,
             cc.name AS cost_center,
             aa.remarks,
             aa.acted_at AS updated_at
      FROM approval_actions aa
      JOIN approval_requests ar ON ar.id = aa.request_id
      JOIN workflow_steps ws ON ws.id = aa.step_id
      JOIN roles r ON r.id = ws.role_id
      LEFT JOIN users u ON u.id = aa.acted_by
      LEFT JOIN employees e ON e.id = u.employee_id
      LEFT JOIN payroll_batches pb ON pb.id = ar.entity_id AND ar.entity_type = 'PAYROLL_BATCH'
      LEFT JOIN cost_centers cc ON cc.id = pb.cost_center_id
      WHERE ar.entity_type = 'PAYROLL_BATCH'
    `
    const params: any[] = []
    if (payrollId) {
      queryText += ` AND ar.entity_id = $1`
      params.push(payrollId)
    }
    queryText += ` ORDER BY ws.step_order ASC, aa.id ASC`

    const res = await pool.query(queryText, params)
    return res.rows.map((row: any) => ({
      id: Number(row.id),
      payrollId: Number(row.payroll_id),
      stage: row.stage,
      status:
        row.action === 'APPROVE'
          ? 'Approved'
          : row.action === 'RETURN'
            ? 'Returned'
            : row.action === 'REJECT'
              ? 'Rejected'
              : 'Pending',
      approverId: row.approver_id ? Number(row.approver_id) : null,
      approverRole: row.approver_role,
      approverName: row.approver_name,
      costCenter: row.cost_center,
      remarks: row.remarks,
      action: row.action,
      sequence: Number(row.sequence),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    }))
  },

  async findByPayroll(payrollId: number): Promise<ApprovalStep[]> {
    return approvalsService.findAll(payrollId)
  },

  async getRoutes(_filters?: {
    payrollTypeId?: string
    fundSource?: string
    costCenter?: string
  }): Promise<ApprovalRouteRule[]> {
    return getApprovalRoute('*', '*', '*')
  },

  async createRoute(data: {
    payrollTypeId?: string
    fundSource?: string
    costCenter?: string
    stageName: string
    sequenceOrder: number
    requiredRole: string
  }): Promise<ApprovalRouteRule> {
    let wtRes = await pool.query(
      `SELECT id FROM workflow_templates WHERE document_type = 'PAYROLL' ORDER BY id ASC LIMIT 1`,
    )
    const templateId =
      wtRes.rows[0]?.id ||
      (
        await pool.query(
          `INSERT INTO workflow_templates (name, document_type) VALUES ('Default Payroll Approval Route', 'PAYROLL') RETURNING id`,
        )
      ).rows[0].id

    const roleRes = await pool.query(`SELECT id FROM roles WHERE name = $1 LIMIT 1`, [data.requiredRole])
    if (roleRes.rows.length === 0) {
      const err = new Error(`Role "${data.requiredRole}" not found.`)
      ;(err as any).statusCode = 400
      throw err
    }

    const res = await pool.query(
      `INSERT INTO workflow_steps (template_id, step_order, role_id, use_cost_center_signatory, step_name)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (template_id, step_order)
       DO UPDATE SET role_id = EXCLUDED.role_id, step_name = EXCLUDED.step_name
       RETURNING id, step_order, step_name`,
      [
        templateId,
        data.sequenceOrder,
        roleRes.rows[0].id,
        data.requiredRole === 'Cost Center Signatory',
        data.stageName,
      ],
    )

    return {
      id: Number(res.rows[0].id),
      payrollTypeId: data.payrollTypeId || '*',
      fundSource: data.fundSource || '*',
      costCenter: data.costCenter || '*',
      stageName: res.rows[0].step_name,
      sequenceOrder: Number(res.rows[0].step_order),
      requiredRole: data.requiredRole,
      isActive: true,
    }
  },

  async deactivateRoute(id: number): Promise<boolean> {
    const res = await pool.query(`DELETE FROM workflow_steps WHERE id = $1 RETURNING id`, [id])
    return res.rows.length > 0
  },

  async validateAllStagesApproved(
    payrollId: number,
    clientOrPool?: any,
  ): Promise<{ valid: boolean; route: ApprovalRouteRule[]; approvals: ApprovalStep[] }> {
    const q = clientOrPool || pool

    const bRes = await q.query(
      `SELECT pb.id, st.code AS status_code
       FROM payroll_batches pb
       JOIN statuses st ON st.id = pb.status_id
       WHERE pb.id = $1`,
      [payrollId],
    )
    if (bRes.rows.length === 0) {
      const err = new Error(`Payroll record #${payrollId} not found.`)
      ;(err as any).statusCode = 404
      throw err
    }
    const batch = bRes.rows[0]
    if (batch.status_code === 'REJECTED' || batch.status_code === 'RETURNED') {
      const err = new Error(`Cannot lock payroll #${payrollId}: status is ${batch.status_code}.`)
      ;(err as any).statusCode = 400
      throw err
    }

    const route = await getApprovalRoute('*', '*', '*', q)
    const approvals = await approvalsService.findAll(payrollId)

    const latestByStage = new Map<string, ApprovalStep>()
    for (const step of approvals) {
      latestByStage.set(step.stage, step)
    }

    for (const r of route) {
      const latest = latestByStage.get(r.stageName)
      if (!latest || latest.status !== 'Approved') {
        const err = new Error(
          `Cannot lock payroll #${payrollId}: stage "${r.stageName}" is incomplete (${latest?.status || 'Not Started'}).`,
        )
        ;(err as any).statusCode = 400
        throw err
      }
    }

    return { valid: true, route, approvals }
  },

  async processDecision(params: {
    payrollId: number
    decision: 'Approved' | 'Returned' | 'Rejected'
    remarks?: string
    actorUser: {
      id: number
      name: string
      username: string
      roles: UserRole[]
      office: string
      costCenter?: string
    }
    costCenter?: string
    ip?: string | null
  }): Promise<{ step: ApprovalStep; nextStage: string; readyForDv: boolean }> {
    const { payrollId, decision, remarks, actorUser, ip } = params

    if ((decision === 'Returned' || decision === 'Rejected') && (!remarks || !remarks.trim())) {
      const err = new Error(`Remarks are required when returning or rejecting a payroll submission.`)
      ;(err as any).statusCode = 400
      throw err
    }

    const batchRes = await pool.query(
      `SELECT pb.*, cc.name AS cost_center_name, st.code AS status_code
       FROM payroll_batches pb
       JOIN cost_centers cc ON cc.id = pb.cost_center_id
       JOIN statuses st ON st.id = pb.status_id
       WHERE pb.id = $1`,
      [payrollId],
    )
    if (batchRes.rows.length === 0) {
      const err = new Error(`Payroll record #${payrollId} not found.`)
      ;(err as any).statusCode = 404
      throw err
    }
    const batch = batchRes.rows[0]

    const route = await getApprovalRoute('*', '*', '*')
    if (route.length === 0) {
      const err = new Error('No approval route configured.')
      ;(err as any).statusCode = 400
      throw err
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Ensure approval_request exists
      let reqRes = await client.query(
        `SELECT * FROM approval_requests WHERE entity_type = 'PAYROLL_BATCH' AND entity_id = $1 ORDER BY id DESC LIMIT 1`,
        [payrollId],
      )
      let request = reqRes.rows[0]
      if (!request) {
        const wtId = (
          await client.query(`SELECT id FROM workflow_templates WHERE document_type = 'PAYROLL' ORDER BY id ASC LIMIT 1`)
        ).rows[0].id
        const pendStatusId = (
          await client.query(`SELECT id FROM statuses WHERE category = 'APPROVAL' AND code = 'PENDING' LIMIT 1`)
        ).rows[0].id
        const insReq = await client.query(
          `INSERT INTO approval_requests (template_id, entity_type, entity_id, current_step, status_id, requested_by)
           VALUES ($1, 'PAYROLL_BATCH', $2, 1, $3, $4)
           RETURNING *`,
          [wtId, payrollId, pendStatusId, actorUser.id],
        )
        request = insReq.rows[0]
      }

      const currentStepIndex = Math.min(Math.max(0, Number(request.current_step) - 1), route.length - 1)
      const currentRouteStage = route[currentStepIndex]
      const stageRoles = getAllowedRolesForStage(currentRouteStage.requiredRole)

      if (!actorUser.roles.some((r) => stageRoles.includes(r))) {
        const err = new Error(
          `Forbidden: Role ${actorUser.roles.join(', ')} cannot sign for stage "${currentRouteStage.stageName}". Required: ${stageRoles.join(', ')}`,
        )
        ;(err as any).statusCode = 403
        throw err
      }

      if (
        currentRouteStage.stageName === 'Cost Center Signatory' &&
        actorUser.roles.some((r) => r === 'Cost Center Signatory' || r === 'Immediate Supervisor')
      ) {
        const actorCc = params.costCenter || actorUser.costCenter || actorUser.office
        const payrollCc = batch.cost_center_name || ''
        if (payrollCc && actorCc && actorCc.toLowerCase() !== payrollCc.toLowerCase()) {
          const err = new Error(
            `Forbidden: Cost center "${actorCc}" does not match payroll cost center "${payrollCc}".`,
          )
          ;(err as any).statusCode = 403
          throw err
        }
      }

      const actionEnum = decision === 'Approved' ? 'APPROVE' : decision === 'Returned' ? 'RETURN' : 'REJECT'
      const actRes = await client.query(
        `INSERT INTO approval_actions (request_id, step_id, acted_by, action, remarks, acted_at)
         VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
         RETURNING *`,
        [request.id, currentRouteStage.id, actorUser.id, actionEnum, remarks || null],
      )

      let nextStage = currentRouteStage.stageName
      let readyForDv = false

      if (decision === 'Approved') {
        if (currentStepIndex < route.length - 1) {
          const nextRoute = route[currentStepIndex + 1]
          nextStage = nextRoute.stageName
          await client.query(`UPDATE approval_requests SET current_step = $1 WHERE id = $2`, [
            currentStepIndex + 2,
            request.id,
          ])
          const urStatus = (
            await client.query(`SELECT id FROM statuses WHERE category = 'PAYROLL' AND code = 'UNDER_REVIEW' LIMIT 1`)
          ).rows[0].id
          await client.query(`UPDATE payroll_batches SET status_id = $1 WHERE id = $2`, [urStatus, payrollId])
        } else {
          nextStage = 'Completed'
          readyForDv = true
          const appReqSt = (
            await client.query(`SELECT id FROM statuses WHERE category = 'APPROVAL' AND code = 'APPROVED' LIMIT 1`)
          ).rows[0].id
          const appPaySt = (
            await client.query(`SELECT id FROM statuses WHERE category = 'PAYROLL' AND code = 'APPROVED' LIMIT 1`)
          ).rows[0].id
          await client.query(`UPDATE approval_requests SET status_id = $1 WHERE id = $2`, [appReqSt, request.id])
          await client.query(`UPDATE payroll_batches SET status_id = $1 WHERE id = $2`, [appPaySt, payrollId])

          // Create obligation slip if not yet created
          const schedDisbSt = (
            await client.query(`SELECT id FROM statuses WHERE category = 'DISBURSEMENT' AND code = 'SCHEDULED' LIMIT 1`)
          ).rows[0].id
          const slipNo = `OBL-${new Date().getFullYear()}-${String(payrollId).padStart(4, '0')}`
          await client.query(
            `INSERT INTO obligation_slips (batch_id, slip_no, amount, status_id)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (slip_no) DO NOTHING`,
            [payrollId, slipNo, batch.total_gross, schedDisbSt],
          )
        }
      } else {
        nextStage = decision
        const reqStCode = decision === 'Returned' ? 'RETURNED' : 'REJECTED'
        const appSt = (
          await client.query(`SELECT id FROM statuses WHERE category = 'APPROVAL' AND code = $1 LIMIT 1`, [reqStCode])
        ).rows[0].id
        const paySt = (
          await client.query(`SELECT id FROM statuses WHERE category = 'PAYROLL' AND code = $1 LIMIT 1`, [reqStCode])
        ).rows[0].id
        await client.query(`UPDATE approval_requests SET status_id = $1 WHERE id = $2`, [appSt, request.id])
        await client.query(`UPDATE payroll_batches SET status_id = $1 WHERE id = $2`, [paySt, payrollId])
      }

      await auditService.logAction(
        actorUser.id,
        `${decision} payroll #${payrollId} at stage "${currentRouteStage.stageName}"`,
        { payrollId, stage: currentRouteStage.stageName, decision, remarks, nextStage, readyForDv },
        ip || null,
        'PAYROLL_BATCH',
        payrollId,
      )

      await client.query('COMMIT')
      return {
        step: {
          id: Number(actRes.rows[0].id),
          payrollId,
          stage: currentRouteStage.stageName,
          status: decision,
          approverId: actorUser.id,
          approverRole: actorUser.roles[0],
          approverName: actorUser.name,
          costCenter: params.costCenter || actorUser.costCenter || actorUser.office,
          remarks,
          action: actionEnum,
          sequence: currentRouteStage.sequenceOrder,
          updatedAt: new Date(actRes.rows[0].acted_at).toISOString(),
        },
        nextStage,
        readyForDv,
      }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },
}
