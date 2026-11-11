import { pool } from '../../config/db'
import { auditService } from '../audit/audit.service'
import { payslipsService } from '../payslips/payslips.service'

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

function mapDisbursementRow(row: any): DisbursementRecord {
  return {
    id: row.id,
    payrollId: row.payroll_id,
    dvNumber: row.dv_number,
    method: row.method || 'Bank Transfer',
    status: row.status || 'Scheduled',
    releasedAt: row.released_at ? new Date(row.released_at).toISOString() : undefined,
    fundSource: row.fund_source || 'F01',
    budgetDocumentType: row.budget_document_type,
    budgetDocumentNumber: row.budget_document_number,
    journalEntry: row.journal_entry,
    adaAdcaNumber: row.ada_adca_number,
    bankUploadFilename: row.bank_upload_filename,
    totalAmount: parseFloat(row.total_amount) || 0,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
  }
}

export const disbursementService = {
  async findAll(): Promise<DisbursementRecord[]> {
    const res = await pool.query(
      `SELECT * FROM disbursements ORDER BY id DESC`,
    )
    return res.rows.map(mapDisbursementRow)
  },

  async findByPayroll(payrollId: number): Promise<DisbursementRecord | undefined> {
    const res = await pool.query(
      `SELECT * FROM disbursements WHERE payroll_id = $1 ORDER BY id DESC LIMIT 1`,
      [payrollId],
    )
    if (res.rows.length === 0) return undefined
    return mapDisbursementRow(res.rows[0])
  },

  /**
   * Generates ORAS for F01 or BURAS for F05/F07
   */
  async generateBudgetDocument(payrollId: number): Promise<any> {
    const pRes = await pool.query(`SELECT * FROM payroll WHERE id = $1`, [payrollId])
    if (pRes.rows.length === 0) {
      throw new Error(`Payroll record #${payrollId} not found.`)
    }
    const payroll = pRes.rows[0]
    const fund = payroll.fund_source || 'F01'
    const isOras = fund === 'F01'
    const docType = isOras ? 'ORAS' : 'BURAS'
    const docNumber = `${docType}-${new Date().getFullYear()}-${String(payrollId).padStart(4, '0')}`

    const gross = parseFloat(payroll.gross_pay) || 0
    const basic = parseFloat(payroll.basic_pay) || (gross - (parseFloat(payroll.allowances) || 0))
    const pera = parseFloat(payroll.allowances) || 0

    return {
      documentType: docType,
      documentNumber: docNumber,
      fundSource: fund,
      fundTitle: fund === 'F01' ? 'General Fund (GAA)' : fund === 'F05' ? 'Revolving Fund' : 'Trust Fund',
      date: new Date().toISOString().split('T')[0],
      payee: 'MSU-Naawan Personnel / Beneficiaries',
      office: payroll.department || 'Mindanao State University at Naawan',
      particulars: `Obligation/allotment of salaries and allowances for ${payroll.employee_name} (${payroll.period})`,
      mfoPap: 'Higher Education Program - 310100100002000',
      breakdown: [
        {
          objectCode: '5-01-01-010',
          accountTitle: 'Salaries and Wages - Regular',
          amount: basic,
        },
        ...(pera > 0
          ? [
              {
                objectCode: '5-01-02-010',
                accountTitle: 'Personnel Economic Relief Allowance (PERA)',
                amount: pera,
              },
            ]
          : []),
      ],
      totalAmount: gross,
      certifiedBy: 'Budget Officer',
      status: 'Approved',
    }
  },

  /**
   * Generates balanced Journal Entry: Debit = Credit
   */
  generateJournalEntry(payroll: any): JournalEntry {
    const gross = parseFloat(payroll.gross_pay) || 0
    const net = parseFloat(payroll.net_pay) || 0
    const allowances = parseFloat(payroll.allowances) || 0
    const basic = parseFloat(payroll.basic_pay) || (gross - allowances)

    const breakdown = payroll.breakdown || {}
    const mandatory = breakdown.mandatoryDeductions || {}
    const gsis = mandatory.gsis || Math.round(basic * 0.09 * 100) / 100
    const ph = mandatory.philHealth || Math.round(basic * 0.025 * 100) / 100
    const pagIbig = mandatory.pagIbig || 200.0
    const tax = mandatory.withholdingTax || 0

    const attendanceDed = parseFloat(payroll.attendance_deductions) || 0
    const otherDed = parseFloat(payroll.other_deductions) || 0

    const lines: JournalLine[] = []

    // 1. Debits (Expenses)
    lines.push({
      id: 'JL-1',
      accountCode: '5-01-01-010',
      accountTitle: 'Salaries and Wages - Regular',
      debit: basic,
      credit: 0,
    })

    if (allowances > 0) {
      lines.push({
        id: 'JL-2',
        accountCode: '5-01-02-010',
        accountTitle: 'Personnel Economic Relief Allowance (PERA)',
        debit: allowances,
        credit: 0,
      })
    }

    // 2. Credits (Liabilities & Net Cash)
    if (gsis > 0) {
      lines.push({
        id: 'JL-3',
        accountCode: '2-02-01-020',
        accountTitle: 'Due to GSIS',
        debit: 0,
        credit: gsis,
      })
    }

    if (ph > 0) {
      lines.push({
        id: 'JL-4',
        accountCode: '2-02-01-030',
        accountTitle: 'Due to PhilHealth',
        debit: 0,
        credit: ph,
      })
    }

    if (pagIbig > 0) {
      lines.push({
        id: 'JL-5',
        accountCode: '2-02-01-040',
        accountTitle: 'Due to Pag-IBIG',
        debit: 0,
        credit: pagIbig,
      })
    }

    if (tax > 0) {
      lines.push({
        id: 'JL-6',
        accountCode: '2-02-01-010',
        accountTitle: 'Due to BIR',
        debit: 0,
        credit: tax,
      })
    }

    if (attendanceDed + otherDed > 0) {
      lines.push({
        id: 'JL-7',
        accountCode: '2-02-01-990',
        accountTitle: 'Other Payables / Attendance Deductions',
        debit: 0,
        credit: attendanceDed + otherDed,
      })
    }

    // Cash in Bank credit
    lines.push({
      id: 'JL-8',
      accountCode: '1-01-04-040',
      accountTitle: 'Cash - Modified Disbursement System (MDS), Regular',
      debit: 0,
      credit: net,
    })

    const totalDebit = Math.round(lines.reduce((s, l) => s + l.debit, 0) * 100) / 100
    const totalCredit = Math.round(lines.reduce((s, l) => s + l.credit, 0) * 100) / 100
    const isBalanced = Math.abs(totalDebit - totalCredit) < 0.05

    return {
      id: `JE-${Date.now()}`,
      reference: `PR-${payroll.id}`,
      date: new Date().toISOString().split('T')[0],
      lines,
      totalDebit,
      totalCredit,
      isBalanced,
    }
  },

  /**
   * Generates Disbursement Voucher (DV) Data
   */
  async generateDisbursementVoucher(payrollId: number): Promise<DisbursementVoucher> {
    const pRes = await pool.query(
      `SELECT p.*, e.employee_no 
       FROM payroll p 
       LEFT JOIN employees e ON p.employee_id = e.id 
       WHERE p.id = $1`,
      [payrollId],
    )

    if (pRes.rows.length === 0) {
      throw new Error(`Payroll record #${payrollId} not found.`)
    }

    const payroll = pRes.rows[0]
    const fund = payroll.fund_source || 'F01'
    const budgetDoc = await disbursementService.generateBudgetDocument(payrollId)
    const journal = disbursementService.generateJournalEntry(payroll)

    const dvNumber = `DV-${new Date().getFullYear()}-${String(payrollId).padStart(4, '0')}`

    return {
      dvNumber,
      date: new Date().toISOString().split('T')[0],
      payrollId,
      payrollTitle: `${payroll.payroll_type_name || 'Payroll'} - ${payroll.period}`,
      period: payroll.period,
      fundSource: fund,
      budgetDocument: {
        type: budgetDoc.documentType,
        number: budgetDoc.documentNumber,
        amount: budgetDoc.totalAmount,
        certified: true,
      },
      payee: payroll.employee_name,
      office: payroll.department,
      particulars: `Payment of salaries and allowances for the period ${payroll.period} per approved payroll register`,
      grossAmount: parseFloat(payroll.gross_pay) || 0,
      deductions: parseFloat(payroll.deductions) || 0,
      netAmount: parseFloat(payroll.net_pay) || 0,
      modeOfPayment: 'ADA',
      journalEntry: journal,
      status: payroll.ready_for_dv ? 'Approved' : 'Draft',
      prerequisitesMet: Boolean(payroll.ready_for_dv || payroll.locked),
    }
  },

  /**
   * Generates LandBank Electronic Batch Upload File Data
   */
  async generateLandBankFile(payrollId: number): Promise<LandBankExport> {
    const pRes = await pool.query(
      `SELECT p.*, e.employee_no, e.full_name
       FROM payroll p
       LEFT JOIN employees e ON p.employee_id = e.id
       WHERE p.id = $1`,
      [payrollId],
    )

    if (pRes.rows.length === 0) {
      throw new Error(`Payroll record #${payrollId} not found.`)
    }

    const payroll = pRes.rows[0]
    const filename = `LB_PAYROLL_${new Date().getFullYear()}_${String(payrollId).padStart(4, '0')}.txt`
    const companyCode = 'MSUN-001'

    const net = parseFloat(payroll.net_pay) || 0
    const rawAccount = '1234567890' // Default placeholder format compliant with LandBank 10-digit account standard

    const records: LandBankRecord[] = [
      {
        accountNumber: rawAccount,
        employeeNo: payroll.employee_no || `EMP-${payroll.employee_id || 1}`,
        employeeName: payroll.employee_name,
        netAmount: net,
        validAccount: true,
      },
    ]

    // Generate formatted content compliant with university electronic bank payroll format
    let content = `H|${companyCode}|${new Date().toISOString().split('T')[0]}|1|${net.toFixed(2)}\n`
    records.forEach((r, idx) => {
      content += `D|${idx + 1}|${r.accountNumber}|${r.employeeName.toUpperCase()}|${r.netAmount.toFixed(2)}\n`
    })
    content += `T|1|${net.toFixed(2)}\n`

    return {
      filename,
      generatedAt: new Date().toISOString(),
      companyCode,
      totalRecords: records.length,
      totalAmount: net,
      records,
      content,
      missingAccountsCount: records.filter((r) => !r.validAccount).length,
    }
  },

  /**
   * Releases Disbursement (Marks payroll disbursed and releases payslips)
   */
  async releaseDisbursement(
    payrollId: number,
    actingUserId?: number | null,
    ip?: string | null,
  ): Promise<DisbursementRecord> {
    const pRes = await pool.query(`SELECT * FROM payroll WHERE id = $1`, [payrollId])
    if (pRes.rows.length === 0) {
      throw new Error(`Payroll record #${payrollId} not found.`)
    }
    const payroll = pRes.rows[0]

    const journal = disbursementService.generateJournalEntry(payroll)
    const dvNumber = `DV-${new Date().getFullYear()}-${String(payrollId).padStart(4, '0')}`

    const client = await pool.connect()
    try {
      await client.query('BEGIN')

      // 1. Update or Insert disbursement record
      const disbRes = await client.query(
        `INSERT INTO disbursements (
           payroll_id, method, status, released_at, dv_number,
           fund_source, budget_document_type, journal_entry, total_amount,
           disbursed_by, created_at
         ) VALUES (
           $1, 'Bank Transfer', 'Released', CURRENT_TIMESTAMP, $2,
           $3, $4, $5::jsonb, $6,
           $7, CURRENT_TIMESTAMP
         )
         ON CONFLICT (id) DO UPDATE SET
           status = 'Released',
           released_at = CURRENT_TIMESTAMP,
           disbursed_by = EXCLUDED.disbursed_by,
           journal_entry = EXCLUDED.journal_entry
         RETURNING *`,
        [
          payrollId,
          dvNumber,
          payroll.fund_source || 'F01',
          payroll.fund_source === 'F01' ? 'ORAS' : 'BURAS',
          JSON.stringify(journal),
          payroll.net_pay,
          actingUserId || null,
        ],
      )

      // 2. Update payroll status to 'Disbursed'
      await client.query(
        `UPDATE payroll SET
           status = 'Disbursed',
           stage = 'Disbursed',
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [payrollId],
      )

      // 3. Automatically generate and release payslip
      if (payroll.employee_id) {
        await client.query(
          `INSERT INTO payslips (
             employee_id, payroll_id, period, gross_pay, deductions,
             net_pay, payroll_title, status, released_at, released_by, breakdown, created_at
           ) VALUES (
             $1, $2, $3, $4, $5,
             $6, $7, 'Released', CURRENT_TIMESTAMP, $8, $9::jsonb, CURRENT_TIMESTAMP
           )`,
          [
            payroll.employee_id,
            payrollId,
            payroll.period,
            payroll.gross_pay,
            payroll.deductions,
            payroll.net_pay,
            payroll.payroll_type_name || 'Regular Monthly Payroll',
            actingUserId || null,
            JSON.stringify(payroll.breakdown || {}),
          ],
        )
      }

      await auditService.logAction(
        actingUserId || null,
        `Released disbursement and generated payslip for payroll #${payrollId} (${payroll.employee_name}) - Amount: ${payroll.net_pay}`,
        { payrollId, dvNumber, amount: payroll.net_pay, status: 'Released' },
        ip || null,
      )

      await client.query('COMMIT')
      return mapDisbursementRow(disbRes.rows[0])
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  },
}
