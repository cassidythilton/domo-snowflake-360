import { TabKey } from './App'
import { cn } from '@/lib/utils'
import { Database, Gauge, Zap, Users, Wand2 } from 'lucide-react'

const items: { key: TabKey; label: string; icon: any }[] = [
  { key: 'cost', label: 'Cost & Credits', icon: Database },
  { key: 'performance', label: 'Performance & Reliability', icon: Gauge },
  { key: 'pipeline', label: 'Pipeline Health', icon: Zap },
  { key: 'adoption', label: 'Adoption & Utilization', icon: Users },
  { key: 'optimization', label: 'AI Query Optimization', icon: Wand2 },
]

export function Sidebar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 p-5">
        <img
          alt="Snowflake"
          className="h-7 w-7"
          src="https://cdn.brandfetch.io/idJz-fGD_q/theme/dark/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B"
        />
        <div>
          <div className="text-base font-semibold tracking-tight">Snow‑Domo 360</div>
          <div className="text-xs text-muted-foreground">Pipeline Observability</div>
        </div>
      </div>
      <div className="px-3">
        {items.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-muted-foreground transition hover:bg-secondary',
              active === key && 'bg-[hsl(var(--primary))] text-white hover:brightness-95',
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <div className="mt-auto space-y-3 p-4">
        <button className="btn-ghost w-full">Dark Mode</button>
      </div>
    </div>
  )
}

