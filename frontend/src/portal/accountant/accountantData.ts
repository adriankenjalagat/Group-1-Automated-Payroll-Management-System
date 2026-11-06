export type AccountantNotification = {
  id: string
  recipientUsername: string
  relatedDvId: string
  relatedPayrollId: string
  title: string
  description: string
  createdAt: string
  read: boolean
  eventReference: string
}

export const initialAccountantNotifications: AccountantNotification[] = [
  {
    id: "DEMO-ACCT-NOTICE-A01",
    recipientUsername: "accountant.demo",
    relatedDvId: "DEMO-DV-2026-A01",
    relatedPayrollId: "DEMO-PAY-APPROVAL-A01",
    title: "New DV for Review",
    description:
      "A checked fictional Disbursement Voucher was forwarded by Accounting for Accountant review.",
    createdAt: "2026-11-10T14:15:00+08:00",
    read: false,
    eventReference: "DEMO-DV-2026-A01-FORWARDED",
  },
  {
    id: "DEMO-ACCT-NOTICE-A02",
    recipientUsername: "accountant.demo",
    relatedDvId: "DEMO-DV-2026-A02",
    relatedPayrollId: "DEMO-PAY-APPROVAL-A02",
    title: "New DV for Review",
    description:
      "A second checked fictional Disbursement Voucher was forwarded for an isolated return-workflow test.",
    createdAt: "2026-11-11T09:15:00+08:00",
    read: false,
    eventReference: "DEMO-DV-2026-A02-FORWARDED",
  },
]
