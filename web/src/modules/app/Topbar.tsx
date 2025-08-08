export function Topbar({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between px-6 py-4">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">Monitor spend patterns and resource utilization</p>
      </div>
      <div className="flex items-center gap-2">
        <select className="rounded-lg border border-[hsl(var(--border))] px-3 py-2 text-sm">
          <option>Last 30 days</option>
          <option>Last 60 days</option>
          <option>Last 90 days</option>
          <option>Last 180 days</option>
        </select>
        <button className="btn-primary">Refresh</button>
      </div>
    </div>
  )
}

