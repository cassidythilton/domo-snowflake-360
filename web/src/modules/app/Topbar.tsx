import { RefreshCw } from 'lucide-react'

export function Topbar({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>
        <p className="text-sm text-gray-600 mt-1">Monitor spend patterns and resource utilization</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Period:</label>
          <select className="text-sm border border-gray-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent">
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
            <option value="180">Last 180 days</option>
          </select>
        </div>
        <button className="btn-primary">
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  )
}

