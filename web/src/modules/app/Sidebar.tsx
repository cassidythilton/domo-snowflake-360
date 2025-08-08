import { TabKey } from './App'
import { cn } from '@/lib/utils'
import { DollarSign, Gauge, Zap, Users, Wand2, Moon } from 'lucide-react'

const items: { key: TabKey; label: string; icon: any }[] = [
  { key: 'cost', label: 'Cost & Credits', icon: DollarSign },
  { key: 'performance', label: 'Performance & Reliability', icon: Gauge },
  { key: 'pipeline', label: 'Pipeline Health', icon: Zap },
  { key: 'adoption', label: 'Adoption & Utilization', icon: Users },
  { key: 'optimization', label: 'AI Query Optimization', icon: Wand2 },
]

export function Sidebar({ active, onChange }: { active: TabKey; onChange: (k: TabKey) => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <img
            alt="Snowflake"
            className="h-8 w-8"
            src="https://cdn.brandfetch.io/idJz-fGD_q/theme/dark/symbol.svg?c=1dxbfHSJFAPEGdCLU4o5B"
          />
          <div>
            <h1 className="text-xl font-bold text-white">Snow‑Domo 360</h1>
            <p className="text-xs text-gray-400">Pipeline Observability</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {items.map(({ key, label, icon: Icon }) => (
            <li key={key}>
              <button
                onClick={() => onChange(key)}
                className={cn(
                  'nav-item w-full',
                  active === key && 'active'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-800 space-y-3">
        <div className="flex items-center space-x-2">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-500 text-white">
            Mock Data
          </span>
          <button className="text-xs text-gray-400 hover:text-white transition-colors">
            Switch to Live
          </button>
        </div>
        <button className="flex items-center gap-2 w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-gray-300 hover:bg-white/15 transition-colors">
          <Moon className="h-4 w-4" />
          <span className="text-sm">Dark Mode</span>
        </button>
      </div>
    </div>
  )
}

