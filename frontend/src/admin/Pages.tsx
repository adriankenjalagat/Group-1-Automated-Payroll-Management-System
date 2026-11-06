import { Icon, type IconName } from '../MsuPayroll'
import { Tag } from './ui'

export function Placeholder({ title, icon, summary, notes }: { title: string; icon: IconName; summary: string; notes: string[] }) {
  return (
    <section className="elevate rounded-card bg-surface p-6 sm:p-10 grid justify-items-center text-center">
      <span className="size-14 rounded-full bg-primary/15 text-primary grid place-items-center mb-4"><Icon name={icon} size={26} /></span>
      <Tag kind="placeholder">Placeholder · not built yet</Tag>
      <h2 className="text-xl font-semibold mt-3">{title}</h2>
      <p className="text-sm text-text-muted mt-2 max-w-prose text-pretty">{summary}</p>
      <ul className="mt-5 grid gap-1.5 text-sm text-text-muted max-w-prose text-left">
        {notes.map((n) => (
          <li key={n} className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-primary" /> {n}</li>
        ))}
      </ul>
    </section>
  )
}
