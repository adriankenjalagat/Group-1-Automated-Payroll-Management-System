import { Icon, type IconName } from '../MsuPayroll'

export function PlannedModule({ title, description, icon }: { title: string; description: string; icon: IconName }) {
  return (
    <div className="grid gap-6">
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-border-strong px-2.5 py-0.5 text-xs font-medium text-text-muted">
          <Icon name="clock" size={13} /> Planned module
        </span>
        <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold mt-3 text-balance">{title}</h1>
        <p className="text-sm text-text-muted mt-2 max-w-prose text-pretty">{description}</p>
      </div>
      <section className="elevate rounded-card bg-surface px-5 py-12 sm:py-16 grid justify-items-center text-center">
        <div aria-hidden="true" className="relative w-56 h-36 text-border-strong">
          <svg viewBox="0 0 224 144" fill="none" className="absolute inset-0 size-full">
            <rect x="8" y="8" width="208" height="128" rx="12" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" />
            <rect x="28" y="28" width="56" height="8" rx="4" fill="currentColor" opacity=".5" />
            <rect x="28" y="44" width="96" height="6" rx="3" fill="currentColor" opacity=".3" />
            <rect x="28" y="108" width="168" height="6" rx="3" fill="currentColor" opacity=".3" />
          </svg>
          <span className="absolute inset-0 grid place-items-center">
            <span className="size-16 rounded-full bg-accent text-on-accent grid place-items-center"><Icon name={icon} size={28} /></span>
          </span>
        </div>
        <h2 className="text-base font-semibold mt-6">This module is not available yet</h2>
        <p className="text-sm text-text-muted mt-1 max-w-sm text-pretty">It will be implemented in a later iteration. Nothing on this screen is functional in this prototype.</p>
      </section>
    </div>
  )
}
