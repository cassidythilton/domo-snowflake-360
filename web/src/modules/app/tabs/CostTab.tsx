import Chart from 'react-apexcharts'
import { currency } from '@/lib/utils'

export function CostTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Spend</p>
              <p className="mt-2 text-3xl font-bold">{currency(1234.56)}</p>
              <p className="mt-1 text-sm text-emerald-600">+5.2% vs last period</p>
            </div>
          </div>
        </div>
        <div className="metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Daily Credits Avg</p>
              <p className="mt-2 text-3xl font-bold">892.3</p>
              <p className="mt-1 text-sm text-red-600">-2.1% vs last period</p>
            </div>
          </div>
        </div>
        <div className="metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active Warehouses</p>
              <p className="mt-2 text-3xl font-bold">12</p>
              <p className="mt-1 text-sm text-muted-foreground">No change</p>
            </div>
          </div>
        </div>
        <div className="metric">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Efficiency Score</p>
              <p className="mt-2 text-3xl font-bold">87.2%</p>
              <p className="mt-1 text-sm text-emerald-600">+1.8% vs last period</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Daily Credits by Service Type</h3>
          <span className="text-sm text-muted-foreground">Last 30 days</span>
        </div>
        <div className="h-80">
          <Chart
            type="area"
            series={[
              { name: 'Compute', data: [10, 12, 9, 14, 18, 16, 22, 20, 19, 24, 22, 28] },
              { name: 'Storage', data: [5, 6, 7, 8, 7, 8, 9, 8, 10, 9, 10, 11] },
            ]}
            options={{
              chart: { toolbar: { show: false }, foreColor: '#6b7280' },
              grid: { borderColor: '#e5e7eb' },
              dataLabels: { enabled: false },
              stroke: { curve: 'smooth', width: 2 },
              xaxis: { categories: Array.from({ length: 12 }, (_, i) => `W${i + 1}`) },
              colors: ['#2F80ED', '#56CCF2'],
              legend: { position: 'top' },
              fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.1 } },
              tooltip: { theme: 'dark' },
            }}
          />
        </div>
      </div>
    </div>
  )
}

