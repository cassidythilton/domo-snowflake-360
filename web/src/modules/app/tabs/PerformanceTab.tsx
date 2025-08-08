export function PerformanceTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="metric"><div className="text-sm text-muted-foreground">P95 Query Time</div><div className="mt-2 text-3xl font-bold">0.42s</div></div>
        <div className="metric"><div className="text-sm text-muted-foreground">Query Failure Rate</div><div className="mt-2 text-3xl font-bold">1.2%</div></div>
        <div className="metric"><div className="text-sm text-muted-foreground">Warehouse Events</div><div className="mt-2 text-3xl font-bold">23</div></div>
        <div className="metric"><div className="text-sm text-muted-foreground">Load Efficiency</div><div className="mt-2 text-3xl font-bold">94.8%</div></div>
      </div>
      <div className="card p-6">P95 Query Duration Trend (chart WIP)</div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">Query Failure Rate Trend (chart WIP)</div>
        <div className="card p-6">Warehouse Events Timeline (chart WIP)</div>
      </div>
    </div>
  )
}

