import type { IconName } from "../MsuPayroll"
import type { Role } from "../auth/mockData"

export type PortalRole = Exclude<Role, "System Administrator">
export type NavItem = {
  id: string
  label: string
  icon: IconName
  description: string
}

export const portalRoles: PortalRole[] = [
  "Employee",
  "Immediate Supervisor",
  "HR Office",
  "Accounting",
  "Accountant",
  "Cost Center Signatory",
  "Budget Office",
  "Office of the Chancellor",
  "Cashier",
]

export const portalName: Record<PortalRole, string> = {
  Employee: "Employee",
  "Immediate Supervisor": "Immediate Supervisor",
  "HR Office": "HR Office",
  Accounting: "Accounting Office",
  Accountant: "Accountant",
  "Cost Center Signatory": "Cost Center Signatory",
  "Budget Office": "Budget Office",
  "Office of the Chancellor": "Chancellor",
  Cashier: "Cashier",
}

const dash = (description: string): NavItem => ({
  id: "dashboard",
  label: "Dashboard",
  icon: "dashboard",
  description,
})

export const roleNav: Record<PortalRole, NavItem[]> = {
  Employee: [
    dash(
      "An overview of your payroll-related submissions, their progress, and recent notices.",
    ),
    {
      id: "submissions",
      label: "My Submissions",
      icon: "clipboard",
      description:
        "Where you will prepare and send the documents and requests that feed into payroll.",
    },
    {
      id: "status",
      label: "Submission Status",
      icon: "clock",
      description:
        "Track the review progress of a selected payroll document submission.",
    },
    {
      id: "payslips",
      label: "My Payslips",
      icon: "mail",
      description:
        "Where you will view your own payslips once payroll has been released.",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "bell",
      description:
        "Where you will see updates and requests that concern your submissions.",
    },
    {
      id: "account",
      label: "My Account",
      icon: "user",
      description:
        "Where you will manage your personal information and account security.",
    },
  ],
  "Immediate Supervisor": [
    dash(
      "An overview of assigned employee submissions awaiting review and recent Supervisor decisions.",
    ),
    {
      id: "pending",
      label: "Pending Submissions",
      icon: "clipboard",
      description:
        "Where assigned employee payroll-document submissions are reviewed or returned.",
    },
    {
      id: "verification",
      label: "Document Verification",
      icon: "check",
      description:
        "Where the selected submission, configured checklist, attachments, and concerns are reviewed.",
    },
    {
      id: "history",
      label: "Validation History",
      icon: "clock",
      description:
        "Where recorded Supervisor validation and return decisions are viewed.",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "bell",
      description:
        "Where updates about assigned employee submissions are shown.",
    },
    {
      id: "account",
      label: "My Account",
      icon: "user",
      description:
        "Where you will manage your personal information and account security.",
    },
  ],
  "HR Office": [
    dash("An overview of the human resource tasks that feed into payroll."),
    {
      id: "records",
      label: "Employee Records",
      icon: "users",
      description:
        "Where authorized HR staff will maintain employment records used by payroll.",
    },
    {
      id: "verification",
      label: "Document Verification",
      icon: "check",
      description:
        "Where you will check employee documents that support payroll processing.",
    },
    {
      id: "attendance",
      label: "Attendance & Leave",
      icon: "clock",
      description:
        "Where you will review attendance and leave information that payroll depends on.",
    },
    {
      id: "transmittals",
      label: "Transmittals",
      icon: "link",
      description:
        "Where you will track documents sent from HR to the next office in the payroll process.",
    },
    {
      id: "account",
      label: "My Account",
      icon: "user",
      description:
        "Where you will view your account information and manage permitted security settings.",
    },
  ],
  Accounting: [
    dash(
      "An overview of payroll work and documents handled by the Accounting Office.",
    ),
    {
      id: "management",
      label: "Payroll Management",
      icon: "sliders",
      description:
        "Where payroll periods and payroll batches will be organized and tracked.",
    },
    {
      id: "computation",
      label: "Payroll Computation",
      icon: "clipboard",
      description:
        "Where payroll will be prepared using rates and rules set by authorized offices.",
    },
    {
      id: "approvals",
      label: "Approval Tracking",
      icon: "shield",
      description:
        "Where you will follow payroll as it moves through each required approval.",
    },
    {
      id: "vouchers",
      label: "Disbursement Vouchers",
      icon: "mail",
      description:
        "Where disbursement vouchers for approved payroll will be prepared and tracked.",
    },
    {
      id: "reports",
      label: "Reports",
      icon: "building",
      description:
        "Where payroll reports will be generated for the Accounting Office.",
    },
    {
      id: "historical-import",
      label: "Historical Import",
      icon: "clock",
      description:
        "Where previous payroll spreadsheets can be validated and retained as read-only historical records.",
    },
  ],
  Accountant: [
    dash(
      "An overview of Disbursement Vouchers awaiting Accountant review and recent decisions.",
    ),
    {
      id: "dv-review",
      label: "DV Review",
      icon: "mail",
      description:
        "Where checked and forwarded Disbursement Vouchers are reviewed and decided.",
    },
    {
      id: "decision-history",
      label: "Decision History",
      icon: "clock",
      description:
        "Where recorded Accountant approvals and returns are viewed.",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "bell",
      description:
        "Where updates about Disbursement Vouchers requiring Accountant attention are shown.",
    },
    {
      id: "account",
      label: "My Account",
      icon: "user",
      description:
        "Where the Accountant views account information and permitted security settings.",
    },
  ],
  "Cost Center Signatory": [
    dash(
      "An overview of payroll and budget documents waiting for your approval.",
    ),
    {
      id: "pending",
      label: "Pending Approvals",
      icon: "clipboard",
      description:
        "Where assigned payroll and ORAS/BURAS approval requests are listed.",
    },
    {
      id: "review",
      label: "Document Review",
      icon: "check",
      description:
        "Where the selected payroll or budget document is reviewed and decided.",
    },
    {
      id: "history",
      label: "Approval History",
      icon: "clock",
      description:
        "Where you will look back at the approvals you have already acted on.",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "bell",
      description:
        "Where updates about documents requiring Cost Center review are shown.",
    },
    {
      id: "account",
      label: "My Account",
      icon: "user",
      description:
        "Where the Cost Center Signatory views account and security settings.",
    },
  ],
  "Budget Office": [
    dash(
      "An overview of approved payrolls and budget documents handled by the Budget Office.",
    ),
    {
      id: "approved",
      label: "Approved Payrolls",
      icon: "check",
      description:
        "Where you will see payrolls that have been approved and are ready for budget processing.",
    },
    {
      id: "oras",
      label: "ORAS/BURAS Preparation",
      icon: "clipboard",
      description:
        "Where obligation and budget utilization documents will be prepared for approved payrolls.",
    },
    {
      id: "tracking",
      label: "Approval Tracking",
      icon: "link",
      description:
        "Where forwarded ORAS/BURAS documents and Cost Center decisions are monitored.",
    },
    {
      id: "history",
      label: "Document History",
      icon: "clock",
      description:
        "Where you will look back at budget documents that have been prepared and routed.",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "bell",
      description:
        "Where approved-payroll, return, and Cost Center approval updates are shown.",
    },
    {
      id: "account",
      label: "My Account",
      icon: "user",
      description:
        "Where the Budget Office user views account and permitted security settings.",
    },
  ],
  "Office of the Chancellor": [
    dash("An overview of DVs waiting for the Chancellor’s decision."),
    {
      id: "dv",
      label: "DV Review",
      icon: "mail",
      description:
        "Where you will review disbursement vouchers before they are approved.",
    },
    {
      id: "history",
      label: "Decision History",
      icon: "clock",
      description:
        "Where recorded Chancellor approval and return decisions are reviewed.",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "bell",
      description:
        "Where DVs newly eligible for Chancellor review are announced.",
    },
    {
      id: "account",
      label: "My Account",
      icon: "user",
      description:
        "Where the Chancellor user views account and permitted security settings.",
    },
  ],
  Cashier: [
    dash(
      "An overview of Chancellor-approved payrolls, exceptions, and release activity.",
    ),
    {
      id: "payroll-release",
      label: "Payroll Release",
      icon: "check",
      description:
        "Where eligible Chancellor-approved payrolls are reviewed and marked Released.",
    },
    {
      id: "generated-documents",
      label: "Generated Documents",
      icon: "clipboard",
      description:
        "Where read-only DV, Payroll Register, ADA/ADCA, and bank-reference metadata are viewed.",
    },
    {
      id: "missing-bank-accounts",
      label: "Missing Bank Accounts",
      icon: "alert",
      description:
        "Where employees excluded from bank data because of missing account information are listed.",
    },
    {
      id: "release-history",
      label: "Release History",
      icon: "clock",
      description:
        "Where recorded payroll releases and document access audit events are reviewed.",
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: "bell",
      description:
        "Where payroll readiness, exception, and release updates are shown.",
    },
    {
      id: "account",
      label: "My Account",
      icon: "user",
      description:
        "Where the Cashier user views account information and permitted security settings.",
    },
  ],
}
