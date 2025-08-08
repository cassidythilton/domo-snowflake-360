export function PipelineTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="metric"><div className="text-sm text-muted-foreground">Connector Success</div><div className="mt-2 text-3xl font-bold">98.7%</div></div>
        <div className="metric"><div className="text-sm text-muted-foreground">SLA Breaches</div><div className="mt-2 text-3xl font-bold">8</div></div>
        <div className="metric"><div className="text-sm text-muted-foreground">Stale Datasets</div><div className="mt-2 text-3xl font-bold">3</div></div>
        <div className="metric"><div className="text-sm text-muted-foreground">Daily Bytes (MB)</div><div className="mt-2 text-3xl font-bold">1,024</div></div>
      </div>
      <div className="card p-6">Bytes Ingested & API Anomalies (chart WIP)</div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-6">Connector Success Rate (chart WIP)</div>
        <div className="card p-6">SLA Breaches Heatmap (chart WIP)</div>
      </div>
    </div>
  )
}

