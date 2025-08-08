export function AdoptionTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="metric"><div className="text-sm text-muted-foreground">Weekly Active Users</div><div className="mt-2 text-3xl font-bold">119</div></div>
        <div className="metric"><div className="text-sm text-muted-foreground">Active Datasets</div><div className="mt-2 text-3xl font-bold">47</div></div>
        <div className="metric"><div className="text-sm text-muted-foreground">Active Connectors</div><div className="mt-2 text-3xl font-bold">18</div></div>
        <div className="metric"><div className="text-sm text-muted-foreground">Cost per User</div><div className="mt-2 text-3xl font-bold">$10.37</div></div>
      </div>
      <div className="card p-6">WAU Trend (chart WIP)</div>
      <div className="card p-6">Top Connectors by Rows Ingested (chart WIP)</div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">Credits vs Users Correlation (chart WIP)</div>
        <div className="card p-6">Dataset Cost Distribution (chart WIP)</div>
      </div>
    </div>
  )
}

