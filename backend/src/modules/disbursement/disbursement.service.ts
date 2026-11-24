import { pool } from '../../config/db'
import { auditService } from '../audit/audit.service'

export interface JournalLine {
  id: string
  accountCode: string
  accountTitle: string
  debit: number
  credit: number
}

export interface JournalEntry {
  id: string
  reference: string
  date: string
  lines: JournalLine[]
  totalDebit: number
  totalCredit: number
  isBalanced: boolean
}

export interface DisbursementVoucher {
  dvNumber: string
  date: string
  payrollId: number
  payrollTitle: string
  period: string
  fundSource: string
  budgetDocument: {
    type: 'ORAS' | 'BURAS'
    number: string
    amount: number
    certified: boolean
  }
  payee: string
  office: string
  particulars: string
  grossAmount: number
  deductions: number
  netAmount: number
  modeOfPayment: 'ADA' | 'MDS Check' | 'Commercial Bank'
  journalEntry: JournalEntry
  status: 'Draft' | 'Certified' | 'Approved' | 'Released'
  prerequisitesMet: boolean
}

export interface LandBankRecord {
  accountNumber: string
  employeeNo: string
  employeeName: string
  netAmount: number
  validAccount: boolean
  bankName?: string
}

export interface ManualDisbursementRecord {
  employeeId?: number
  employeeNo: string
  employeeName: string
  netAmount: number
  reason: string
}

export interface LandBankReconciliation {
  totalApprovedPayrollAmount: number
  bankDisbursementAmount: number
  manualDisbursementAmount: number
  isReconciled: boolean
  accountingDecisionRequired: string
}

export interface LandBankExport {
  filename: string
  generatedAt: string
  companyCode: string
  totalRecords: number
  totalAmount: number
  records: LandBankRecord[]
  content: string
  missingAccountsCount: number
  manualDisbursementEmployees: ManualDisbursementRecord[]
  manualDisbursementAmount: number
  totalApprovedPayrollAmount: number
  reconciliation: LandBankReconciliation
}

export function isValidLandBankAccount(accountNumber?: string | null): boolean {
  if (!accountNumber) return false
  const clean = accountNumber.trim()
  if (!/^\d{10,16}$/.test(clean)) return false
  if (/^(\d)\1+$/.test(clean)) return false
  if (clean === '1234567890' || clean === '0123456789' || clean === '9876543210') return false
  return true
}

export interface DisbursementRecord {
  id: number
  payrollId: number
  dvNumber?: string
  method: string
  status: string
  releasedAt?: string
  fundSource?: string
  budgetDocumentType?: string
  budgetDocumentNumber?: string
  journalEntry?: JournalEntry
  adaAdcaNumber?: string
  bankUploadFilename?: string
  totalAmount: number
  createdAt: string
}

const BATCH_DETAIL_SQL = `
  SELECT pb.*,
         pp.label AS period_label,
         o.name AS office_name,
         f.code AS fund_code,
         st_slip.code AS slip_type_code,
         et.name AS emp_type_name,
         st.code AS status_code,
         pi.id AS payroll_item_id,
         e.id AS employee_id,
         e.employee_no,
         TRIM(CONCAT_WS(' ', e.first_name, e.middle_name, e.last_name)) AS employee_name,
         e.bank_account_no
  FROM payroll_batches pb
  JOIN payroll_periods pp ON pp.id = pb.period_id
  JOIN offices o ON o.id = pb.office_id
  JOIN funds f ON f.id = pb.fund_id
  JOIN slip_types st_slip ON st_slip.id = f.slip_type_id
  JOIN employment_types et ON et.id = pb.employment_type_id
  JOIN statuses st ON st.id = pb.status_id
  LEFT JOIN LATERAL (
    SELECT * FROM payroll_items WHERE batch_id = pb.id ORDER BY id ASC LIMIT 1
  ) pi ON TRUE
  LEFT JOIN appointments a ON a.id = pi.appointment_id
  LEFT JOIN employees e ON e.id = a.employee_id
`

export const disbursementService = {
  async findAll(): Promise<DisbursementRecord[]> {
    const res = await pool.query(
      `SELECT os.id,
              os.batch_id AS payroll_id,
              os.slip_no AS budget_document_number,
              os.amount AS total_amount,
              dv.dv_no AS dv_number,
              dv.dv_date,
              COALESCE(st_dv.name, st_os.name, 'Scheduled') AS status,
              f.code AS fund_source,
              slt.code AS budget_document_type,
              af.ada_no AS ada_adca_number,
              buf.file_name AS bank_upload_filename,
              af.generated_at AS released_at
       FROM obligation_slips os
       JOIN payroll_batches pb ON pb.id = os.batch_id
       JOIN funds f ON f.id = pb.fund_id
       JOIN slip_types slt ON slt.id = f.slip_type_id
       JOIN statuses st_os ON st_os.id = os.status_id
       LEFT JOIN disbursement_vouchers dv ON dv.obligation_slip_id = os.id
       LEFT JOIN statuses st_dv ON st_dv.id = dv.status_id
       LEFT JOIN LATERAL (
         SELECT * FROM ada_forms WHERE batch_id = os.batch_id ORDER BY id DESC LIMIT 1
       ) af ON TRUE
       LEFT JOIN bank_upload_files buf ON buf.ada_id = af.id
       ORDER BY os.id DESC`,
    )
    return res.rows.map((r: any) => ({
      id: Number(r.id),
      payrollId: Number(r.payroll_id),
      dvNumber: r.dv_number || undefined,
      method: 'ADA',
      status: r.status || 'Scheduled',
      releasedAt: r.released_at ? new Date(r.released_at).toISOString() : undefined,
      fundSource: r.fund_source || 'F01',
      budgetDocumentType: r.budget_document_type || 'ORAS',
      budgetDocumentNumber: r.budget_document_number || undefined,
      adaAdcaNumber: r.ada_adca_number || undefined,
      bankUploadFilename: r.bank_upload_filename || undefined,
      totalAmount: parseFloat(r.total_amount) || 0,
      createdAt: r.dv_date ? new Date(r.dv_date).toISOString() : new Date().toISOString(),
    }))
  },

  async findByPayroll(payrollId: number): Promise<DisbursementRecord | undefined> {
    const all = await disbursementService.findAll()
    return all.find((d) => d.payrollId === payrollId)
  },

  async generateBudgetDocument(payrollId: number): Promise<any> {
    const res = await pool.query(`${BATCH_DETAIL_SQL} WHERE pb.id = $1`, [payrollId])
    if (res.rows.length === 0) throw new Error(`Payroll record #${payrollId} not found.`)
    const b = res.rows[0]
    const docType = b.slip_type_code === 'BURAS' ? 'BURAS' : 'ORAS'
    const docNumber = `${docType}-${new Date().getFullYear()}-${String(payrollId).padStart(4, '0')}`
    const gross = parseFloat(b.total_gross) || 0

    return {
      documentType: docType,
      documentNumber: docNumber,
      fundSource: b.fund_code || 'F01',
      fundTitle: b.fund_code === 'F01' ? 'General Fund (GAA)' : b.fund_code === 'F05' ? 'Revolving Fund' : 'Trust Fund',
      date: new Date().toISOString().split('T')[0],
      payee: 'MSU-Naawan Personnel / Beneficiaries',
      office: b.office_name || 'Mindanao State University at Naawan',
      particulars: `Obligation/allotment of salaries for ${b.employee_name || b.batch_no} (${b.period_label})`,
      mfoPap: 'Higher Education Program - 310100100002000',
      breakdown: [
        { objectCode: '5-01-01-010', accountTitle: 'Salaries and Wages - Regular', amount: gross },
      ],
      totalAmount: gross,
      certifiedBy: 'Budget Officer',
      status: 'Approved',
    }
  },

  generateJournalEntry(batch: any): JournalEntry {
    const gross = parseFloat(batch.total_gross) || 0
    const ded = parseFloat(batch.total_deductions) || 0
    const net = parseFloat(batch.total_net) || 0

    const lines: JournalLine[] = [
      { id: 'JL-1', accountCode: '5-01-01-010', accountTitle: 'Salaries and Wages - Regular', debit: gross, credit: 0 },
    ]
    if (ded > 0) {
      lines.push({
        id: 'JL-2',
        accountCode: '2-02-01-020',
        accountTitle: 'Statutory & Payroll Deductions Payable',
        debit: 0,
        credit: ded,
      })
    }
    lines.push({
      id: 'JL-3',
      accountCode: '1-01-04-040',
      accountTitle: 'Cash - Modified Disbursement System (MDS), Regular',
      debit: 0,
      credit: net,
    })

    const totalDebit = Math.round(lines.reduce((s, l) => s + l.debit, 0) * 100) / 100
    const totalCredit = Math.round(lines.reduce((s, l) => s + l.credit, 0) * 100) / 100
    return {
      id: `JE-${Date.now()}`,
      reference: `PR-${batch.id}`,
      date: new Date().toISOString().split('T')[0],
      lines,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.05,
    }
  },

  async generateDisbursementVoucher(payrollId: number): Promise<DisbursementVoucher> {
    const res = await pool.query(`${BATCH_DETAIL_SQL} WHERE pb.id = $1`, [payrollId])
    if (res.rows.length === 0) throw new Error(`Payroll record #${payrollId} not found.`)
    const b = res.rows[0]
    const budgetDoc = await disbursementService.generateBudgetDocument(payrollId)
    const journal = disbursementService.generateJournalEntry(b)
    const dvNumber = `DV-${new Date().getFullYear()}-${String(payrollId).padStart(4, '0')}`
    const approved = b.status_code === 'APPROVED' || b.status_code === 'DISBURSED'

    return {
      dvNumber,
      date: new Date().toISOString().split('T')[0],
      payrollId,
      payrollTitle: `${b.emp_type_name || 'Payroll'} - ${b.period_label}`,
      period: b.period_label,
      fundSource: b.fund_code || 'F01',
      budgetDocument: {
        type: budgetDoc.documentType,
        number: budgetDoc.documentNumber,
        amount: budgetDoc.totalAmount,
        certified: true,
      },
      payee: b.employee_name || b.batch_no,
      office: b.office_name,
      particulars: `Payment of salaries for period ${b.period_label} per approved payroll register`,
      grossAmount: parseFloat(b.total_gross) || 0,
      deductions: parseFloat(b.total_deductions) || 0,
      netAmount: parseFloat(b.total_net) || 0,
      modeOfPayment: 'ADA',
      journalEntry: journal,
      status: b.status_code === 'DISBURSED' ? 'Released' : approved ? 'Approved' : 'Draft',
      prerequisitesMet: approved,
    }
  },

  async generateLandBankFile(
    payrollId: number,
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<LandBankExport> {
    const res = await pool.query(`${BATCH_DETAIL_SQL} WHERE pb.id = $1`, [payrollId])
    if (res.rows.length === 0) throw new Error(`Payroll record #${payrollId} not found.`)
    const b = res.rows[0]
    const filename = `LB_PAYROLL_${new Date().getFullYear()}_${String(payrollId).padStart(4, '0')}.txt`
    const companyCode = 'MSUN-001'
    const net = parseFloat(b.total_net) || 0
    const rawAccount = b.bank_account_no ? String(b.bank_account_no).trim() : ''

    const records: LandBankRecord[] = []
    const manualDisbursementEmployees: ManualDisbursementRecord[] = []

    if (isValidLandBankAccount(rawAccount)) {
      records.push({
        accountNumber: rawAccount,
        employeeNo: b.employee_no || `EMP-${b.employee_id || 1}`,
        employeeName: b.employee_name || b.batch_no,
        netAmount: net,
        validAccount: true,
        bankName: 'LandBank',
      })
    } else {
      manualDisbursementEmployees.push({
        employeeId: b.employee_id ? Number(b.employee_id) : undefined,
        employeeNo: b.employee_no || `EMP-${b.employee_id || 1}`,
        employeeName: b.employee_name || b.batch_no,
        netAmount: net,
        reason: rawAccount ? 'Invalid bank account number format' : 'No bank account on record',
      })
    }

    const bankAmt = Math.round(records.reduce((s, r) => s + r.netAmount, 0) * 100) / 100
    const manualAmt = Math.round(manualDisbursementEmployees.reduce((s, r) => s + r.netAmount, 0) * 100) / 100

    let content = `H|${companyCode}|${new Date().toISOString().split('T')[0]}|${records.length}|${bankAmt.toFixed(2)}\n`
    records.forEach((r, idx) => {
      content += `D|${idx + 1}|${r.accountNumber}|${r.employeeName.toUpperCase()}|${r.netAmount.toFixed(2)}\n`
    })
    content += `T|${records.length}|${bankAmt.toFixed(2)}\n`

    const reconciliation: LandBankReconciliation = {
      totalApprovedPayrollAmount: net,
      bankDisbursementAmount: bankAmt,
      manualDisbursementAmount: manualAmt,
      isReconciled: Math.abs(net - (bankAmt + manualAmt)) < 0.01,
      accountingDecisionRequired:
        'University Accounting Decision Required for electronic LandBank vs manual check/cash disbursement.',
    }

    if (actingUserId !== undefined) {
      await auditService.logAction(
        actingUserId || null,
        `Generated LandBank disbursement file for payroll #${payrollId}`,
        { payrollId, filename, bankAmt, manualAmt },
        ip || null,
        'BANK_UPLOAD_FILE',
        payrollId,
      )
    }

    return {
      filename,
      generatedAt: new Date().toISOString(),
      companyCode,
      totalRecords: records.length,
      totalAmount: bankAmt,
      records,
      content,
      missingAccountsCount: manualDisbursementEmployees.length,
      manualDisbursementEmployees,
      manualDisbursementAmount: manualAmt,
      totalApprovedPayrollAmount: net,
      reconciliation,
    }
  },

  async releaseDisbursement(
    payrollId: number,
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<DisbursementRecord> {
    const res = await pool.query(`${BATCH_DETAIL_SQL} WHERE pb.id = $1`, [payrollId])
    if (res.rows.length === 0) throw new Error(`Payroll record #${payrollId} not found.`)
    const b = res.rows[0]

    const journal = disbursementService.generateJournalEntry(b)
    const year = new Date().getFullYear()
    const slipNo = `OBL-${year}-${String(payrollId).padStart(4, '0')}`
    const dvNo = `DV-${year}-${String(payrollId).padStart(4, '0')}`
    const jevNo = `JEV-${year}-${String(payrollId).padStart(4, '0')}`
    const adaNo = `ADA-${year}-${String(payrollId).padStart(4, '0')}`
    const lbFile = `LB_PAYROLL_${year}_${String(payrollId).padStart(4, '0')}.txt`

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      const relDisbSt = (
        await client.query(`SELECT id FROM statuses WHERE category = 'DISBURSEMENT' AND code = 'RELEASED' LIMIT 1`)
      ).rows[0].id
      const disbPaySt = (
        await client.query(`SELECT id FROM statuses WHERE category = 'PAYROLL' AND code = 'DISBURSED' LIMIT 1`)
      ).rows[0].id
      const actorId =
        actingUserId ||
        Number((await client.query(`SELECT id FROM users ORDER BY id ASC LIMIT 1`)).rows[0].id)

      // 1. Upsert obligation_slip
      const osRes = await client.query(
        `INSERT INTO obligation_slips (batch_id, slip_no, amount, status_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (slip_no) DO UPDATE SET status_id = EXCLUDED.status_id
         RETURNING id`,
        [payrollId, slipNo, b.total_gross, relDisbSt],
      )
      const osId = Number(osRes.rows[0].id)

      // 2. Upsert disbursement_voucher
      const dvRes = await client.query(
        `INSERT INTO disbursement_vouchers (obligation_slip_id, dv_no, amount, dv_date, status_id)
         VALUES ($1, $2, $3, CURRENT_DATE, $4)
         ON CONFLICT (obligation_slip_id) DO UPDATE SET status_id = EXCLUDED.status_id
         RETURNING id`,
        [osId, dvNo, b.total_net, relDisbSt],
      )
      const dvId = Number(dvRes.rows[0].id)

      // 3. Upsert journal_entry + lines
      const jeRes = await client.query(
        `INSERT INTO journal_entries (disbursement_voucher_id, jev_no, entry_date, particulars, prepared_by)
         VALUES ($1, $2, CURRENT_DATE, $3, $4)
         ON CONFLICT (disbursement_voucher_id) DO UPDATE SET particulars = EXCLUDED.particulars
         RETURNING id`,
        [dvId, jevNo, `Payroll disbursement for batch ${b.batch_no}`, actorId],
      )
      const jeId = Number(jeRes.rows[0].id)
      await client.query(`DELETE FROM journal_entry_lines WHERE journal_entry_id = $1`, [jeId])
      for (const line of journal.lines) {
        await client.query(
          `INSERT INTO journal_entry_lines (journal_entry_id, account_code, account_title, debit, credit)
           VALUES ($1, $2, $3, $4, $5)`,
          [jeId, line.accountCode, line.accountTitle, line.debit, line.credit],
        )
      }

      // 4. Upsert ada_form & bank_upload_file
      const adaRes = await client.query(
        `INSERT INTO ada_forms (batch_id, form_type, ada_no, total_amount, file_path, status_id)
         VALUES ($1, 'ADA', $2, $3, $4, $5)
         ON CONFLICT (ada_no) DO UPDATE SET status_id = EXCLUDED.status_id
         RETURNING id`,
        [payrollId, adaNo, b.total_net, `/uploads/${adaNo}.pdf`, relDisbSt],
      )
      const adaId = Number(adaRes.rows[0].id)
      await client.query(
        `INSERT INTO bank_upload_files (ada_id, file_name, record_count, total_amount)
         VALUES ($1, $2, 1, $3)
         ON CONFLICT (ada_id) DO UPDATE SET file_name = EXCLUDED.file_name`,
        [adaId, lbFile, b.total_net],
      )

      // 5. Update payroll_batch status to DISBURSED
      await client.query(`UPDATE payroll_batches SET status_id = $1 WHERE id = $2`, [disbPaySt, payrollId])

      // 6. Publish payslips for all items in this batch
      await client.query(
        `INSERT INTO payslips (payroll_item_id, published_at)
         SELECT id, CURRENT_TIMESTAMP FROM payroll_items WHERE batch_id = $1
         ON CONFLICT (payroll_item_id) DO NOTHING`,
        [payrollId],
      )

      await auditService.logAction(
        actorId,
        `Released disbursement & published payslip for payroll #${payrollId}`,
        { payrollId, dvNo, adaNo, amount: b.total_net },
        ip || null,
        'DISBURSEMENT_VOUCHER',
        dvId,
      )

      await client.query('COMMIT')
      return (await disbursementService.findByPayroll(payrollId))!
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },
}
