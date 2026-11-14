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

function mapApprovalRow(row: any): ApprovalStep {
  return {
    id: row.id,
    payrollId: row.payroll_id,
    stage: row.stage,
    status: row.status,
    approverId: row.approver_id,
    approverRole: row.approver_role,
    approverName: row.approver_name,
    costCenter: row.cost_center,
    remarks: row.remarks,
    action: row.action,
    sequence: row.sequence,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
  }
}

function mapRouteRow(row: any): ApprovalRouteRule {
  return {
    id: row.id,
    payrollTypeId: row.payroll_type_id,
    fundSource: row.fund_source,
    costCenter: row.cost_center,
    stageName: row.stage_name,
    sequenceOrder: row.sequence_order,
    requiredRole: row.required_role,
    isActive: Boolean(row.is_active),
  }
}

/**
 * Retrieves the approval route for a given payroll, prioritizing the most specific
 * matching rule (exact payroll_type_id + fund_source + cost_center) first, then
 * falling back to wildcard ('*') rules.
 */
async function getApprovalRoute(
  payrollTypeId: string,
  fundSource: string,
  costCenter: string,
): Promise<ApprovalRouteRule[]> {
  // Query all active rules, ordered by specificity (exact matches first) then sequence
  const res = await pool.query(
    `SELECT * FROM approval_routes
     WHERE is_active = TRUE
       AND (payroll_type_id = $1 OR payroll_type_id = '*')
       AND (fund_source = $2 OR fund_source = '*')
       AND (cost_center = $3 OR cost_center = '*')
     ORDER BY
       -- Most specific rules first (fewer wildcards = higher priority)
       (CASE WHEN payroll_type_id = '*' THEN 0 ELSE 1 END +
        CASE WHEN fund_source = '*' THEN 0 ELSE 1 END +
        CASE WHEN cost_center = '*' THEN 0 ELSE 1 END) DESC,
       sequence_order ASC`,
    [payrollTypeId || '*', fundSource || '*', costCenter || '*'],
  )

  if (res.rows.length === 0) {
    return []
  }

  // Group by specificity score: take the most specific set of rules
  const rows = res.rows
  const topScore =
    (rows[0].payroll_type_id !== '*' ? 1 : 0) +
    (rows[0].fund_source !== '*' ? 1 : 0) +
    (rows[0].cost_center !== '*' ? 1 : 0)

  const bestRules = rows.filter((r: any) => {
    const score =
      (r.payroll_type_id !== '*' ? 1 : 0) +
      (r.fund_source !== '*' ? 1 : 0) +
      (r.cost_center !== '*' ? 1 : 0)
    return score === topScore
  })

  return bestRules.map(mapRouteRow)
}

/**
 * Maps an approval route's required_role to the set of UserRoles
 * that are authorized to sign at that stage.
 */
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

export const approvalsService = {
  async findAll(payrollId?: number): Promise<ApprovalStep[]> {
    let queryText = `SELECT * FROM approvals`
    const params: any[] = []
    if (payrollId) {
      queryText += ` WHERE payroll_id = $1`
      params.push(payrollId)
    }
    queryText += ` ORDER BY sequence ASC, id ASC`

    const res = await pool.query(queryText, params)
    return res.rows.map(mapApprovalRow)
  },

  async findByPayroll(payrollId: number): Promise<ApprovalStep[]> {
    return approvalsService.findAll(payrollId)
  },

  /**
   * Get all configured approval routes. Optionally filter by payroll type,
   * fund source, or cost center.
   */
  async getRoutes(filters?: {
    payrollTypeId?: string
    fundSource?: string
    costCenter?: string
  }): Promise<ApprovalRouteRule[]> {
    let queryText = `SELECT * FROM approval_routes WHERE is_active = TRUE`
    const params: any[] = []
    let idx = 1

    if (filters?.payrollTypeId) {
      queryText += ` AND payroll_type_id = $${idx++}`
      params.push(filters.payrollTypeId)
    }
    if (filters?.fundSource) {
      queryText += ` AND fund_source = $${idx++}`
      params.push(filters.fundSource)
    }
    if (filters?.costCenter) {
      queryText += ` AND cost_center = $${idx++}`
      params.push(filters.costCenter)
    }

    queryText += ` ORDER BY sequence_order ASC`
    const res = await pool.query(queryText, params)
    return res.rows.map(mapRouteRow)
  },

  /**
   * Create a new approval route rule.
   */
  async createRoute(data: {
    payrollTypeId?: string
    fundSource?: string
    costCenter?: string
    stageName: string
    sequenceOrder: number
    requiredRole: string
  }): Promise<ApprovalRouteRule> {
    const res = await pool.query(
      `INSERT INTO approval_routes (payroll_type_id, fund_source, cost_center, stage_name, sequence_order, required_role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)
       RETURNING *`,
      [
        data.payrollTypeId || '*',
        data.fundSource || '*',
        data.costCenter || '*',
        data.stageName,
        data.sequenceOrder,
        data.requiredRole,
      ],
    )
    return mapRouteRow(res.rows[0])
  },

  /**
   * Deactivate an approval route rule (soft delete).
   */
  async deactivateRoute(id: number): Promise<boolean> {
    const res = await pool.query(
      `UPDATE approval_routes SET is_active = FALSE WHERE id = $1 RETURNING id`,
      [id],
    )
    return res.rows.length > 0
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

    // Remarks required for Returned or Rejected
    if ((decision === 'Returned' || decision === 'Rejected') && (!remarks || !remarks.trim())) {
      const err = new Error(`Remarks are required when returning or rejecting a payroll submission.`)
        ; (err as any).statusCode = 400
      throw err
    }

    const payrollRes = await pool.query(`SELECT * FROM payroll WHERE id = $1`, [payrollId])
    if (payrollRes.rows.length === 0) {
      const err = new Error(`Payroll record #${payrollId} not found.`)
        ; (err as any).statusCode = 404
      throw err
    }

    const payroll = payrollRes.rows[0]
    if (payroll.locked && decision === 'Approved' && payroll.status === 'Approved') {
      const err = new Error(`Payroll record #${payrollId} is already approved and locked.`)
        ; (err as any).statusCode = 400
      throw err
    }

    // Retrieve the configurable approval route from the database
    const route = await getApprovalRoute(
      payroll.payroll_type_id || '*',
      payroll.fund_source || '*',
      payroll.cost_center || payroll.department || '*',
    )

    if (route.length === 0) {
      const err = new Error(`No approval route is configured for this payroll type and fund source.`)
        ; (err as any).statusCode = 400
      throw err
    }

    // Determine current pending stage
    const pendingStepRes = await pool.query(
      `SELECT * FROM approvals 
       WHERE payroll_id = $1 AND status = 'Pending' 
       ORDER BY sequence ASC, id ASC 
       LIMIT 1`,
      [payrollId],
    )

    let currentStep = pendingStepRes.rows[0]
    if (!currentStep) {
      // If no pending step exists, create one from the first route stage
      const firstStage = route[0]
      const matchingStage = route.find((r) => r.stageName === payroll.stage)
      const currentStage = matchingStage ? matchingStage.stageName : firstStage.stageName
      const insRes = await pool.query(
        `INSERT INTO approvals (payroll_id, stage, status, sequence, updated_at)
         VALUES ($1, $2, 'Pending', 1, CURRENT_TIMESTAMP)
         RETURNING *`,
        [payrollId, currentStage],
      )
      currentStep = insRes.rows[0]
    }

    // Find the current stage in the route
    const currentRouteStage = route.find((r) => r.stageName === currentStep.stage)

    // Validate signatory permissions against current stage using the route's required_role
    const stageRoles = currentRouteStage
      ? getAllowedRolesForStage(currentRouteStage.requiredRole)
      : getAllowedRolesForStage(currentStep.stage)

    const hasRole = actorUser.roles.some((r) => stageRoles.includes(r))

    if (!hasRole) {
      // Log the unauthorized attempt
      await auditService.logAction(
        actorUser.id,
        `DENIED: Attempted to sign payroll #${payrollId} at stage "${currentStep.stage}" without required role`,
        {
          payrollId,
          stage: currentStep.stage,
          decision,
          actorRoles: actorUser.roles,
          requiredRoles: stageRoles,
        },
        ip || null,
      )

      const err = new Error(
        `Forbidden: Role ${actorUser.roles.join(', ')} cannot sign for stage "${currentStep.stage}". Required: ${stageRoles.join(', ')}`,
      )
        ; (err as any).statusCode = 403
      throw err
    }

    // TASK 2: Cost Center Authorization — enforce strict cost center match for Cost Center Signatory stage
    if (
      currentStep.stage === 'Cost Center Signatory' &&
      actorUser.roles.some((r) => r === 'Cost Center Signatory' || r === 'Immediate Supervisor')
    ) {
      const actorCostCenter = params.costCenter || actorUser.costCenter || actorUser.office
      const payrollCostCenter = payroll.cost_center || payroll.department || ''

      if (
        payrollCostCenter &&
        actorCostCenter &&
        actorCostCenter.toLowerCase() !== payrollCostCenter.toLowerCase()
      ) {
        // Log the cost center mismatch attempt
        await auditService.logAction(
          actorUser.id,
          `DENIED: Cost center mismatch for payroll #${payrollId}. Actor: "${actorCostCenter}", Payroll: "${payrollCostCenter}"`,
          {
            payrollId,
            stage: currentStep.stage,
            decision,
            actorCostCenter,
            payrollCostCenter,
          },
          ip || null,
        )

        const err = new Error(
          `Forbidden: Your assigned cost center "${actorCostCenter}" does not match the payroll's cost center "${payrollCostCenter}". You may only approve payrolls for your assigned cost center.`,
        )
          ; (err as any).statusCode = 403
        throw err
      }
    }

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // Update current step
      const updatedStepRes = await client.query(
        `UPDATE approvals SET
           status = $1,
           action = $1,
           approver_id = $2,
           approver_role = $3,
           approver_name = $4,
           cost_center = $5,
           remarks = $6,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $7
         RETURNING *`,
        [
          decision,
          actorUser.id,
          actorUser.roles[0],
          actorUser.name,
          params.costCenter || actorUser.costCenter || actorUser.office,
          remarks || null,
          currentStep.id,
        ],
      )

      let nextStage = currentStep.stage
      let readyForDv = false

      if (decision === 'Approved') {
        // Find the next stage in the DB-backed route
        const currentSeqIndex = route.findIndex((r) => r.stageName === currentStep.stage)

        if (currentSeqIndex >= 0 && currentSeqIndex < route.length - 1) {
          // Advance to next stage from the route
          const nextRouteStage = route[currentSeqIndex + 1]
          nextStage = nextRouteStage.stageName

          await client.query(
            `INSERT INTO approvals (payroll_id, stage, status, sequence, updated_at)
             VALUES ($1, $2, 'Pending', $3, CURRENT_TIMESTAMP)`,
            [payrollId, nextStage, nextRouteStage.sequenceOrder],
          )

          await client.query(
            `UPDATE payroll SET
               stage = $1,
               current_approval_holder = $1,
               status = 'Under Review',
               updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [nextStage, payrollId],
          )
        } else {
          // Final approval complete — all configured stages passed
          nextStage = 'Completed'
          readyForDv = true

          await client.query(
            `UPDATE payroll SET
               stage = 'Completed',
               current_approval_holder = 'Completed',
               status = 'Approved',
               locked = TRUE,
               locked_at = CURRENT_TIMESTAMP,
               locked_by = $1,
               ready_for_dv = TRUE,
               updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [actorUser.id, payrollId],
          )

          // Schedule initial disbursement entry
          await client.query(
            `INSERT INTO disbursements (
               payroll_id, method, status, total_amount, fund_source, created_at
             ) VALUES (
               $1, 'Bank Transfer', 'Scheduled', $2, $3, CURRENT_TIMESTAMP
             )`,
            [payrollId, payroll.net_pay, payroll.fund_source || 'F01'],
          )
        }
      } else {
        // Returned or Rejected
        nextStage = 'Returned'
        readyForDv = false

        await client.query(
          `UPDATE payroll SET
             stage = 'Returned',
             current_approval_holder = 'Accounting',
             status = 'Returned',
             locked = FALSE,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $1`,
          [payrollId],
        )
      }

      await auditService.logAction(
        actorUser.id,
        `${decision} payroll #${payrollId} at stage "${currentStep.stage}" by ${actorUser.name} (${actorUser.roles.join(', ')})`,
        {
          payrollId,
          stage: currentStep.stage,
          decision,
          remarks,
          nextStage,
          readyForDv,
        },
        ip || null,
      )

      await client.query('COMMIT')
      return {
        step: mapApprovalRow(updatedStepRes.rows[0]),
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
