import Chart from 'react-apexcharts'
import { currency } from '@/lib/utils'
import { DollarSign, BarChart3, Building2, CheckCircle } from 'lucide-react'

const metrics = [
  {
    title: 'Total Spend',
    value: currency(1234.56),
    change: '+5.2% vs last period',
    changeType: 'positive' as const,
    icon: DollarSign,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600'
  },
  {
    title: 'Daily Credits Avg',
    value: '892.3',
    change: '-2.1% vs last period',
    changeType: 'negative' as const,
    icon: BarChart3,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  {
    title: 'Active Warehouses',
    value: '12',
    change: 'No change',
    changeType: 'neutral' as const,
    icon: Building2,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600'
  },
  {
    title: 'Efficiency Score',
    value: '87.2%',
    change: '+1.8% vs last period',
    changeType: 'positive' as const,
    icon: CheckCircle,
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600'
  }
]

export function CostTab() {
  return (
    <div className="space-y-8">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          return (
            <div key={index} className="metric-card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">{metric.title}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{metric.value}</p>
                  <p className={`text-sm mt-1 ${
                    metric.changeType === 'positive' ? 'text-green-600' :
                    metric.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {metric.change}
                  </p>
                </div>
                <div className={`p-3 rounded-xl ${metric.iconBg}`}>
                  <Icon className={`w-6 h-6 ${metric.iconColor}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full Width Chart */}
      <div className="chart-card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Daily Credits by Service Type</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Last 30 days</span>
          </div>
        </div>
        <div className="h-80">
          <Chart
            type="area"
            series={[
              { name: 'Compute', data: [10, 12, 9, 14, 18, 16, 22, 20, 19, 24, 22, 28] },
              { name: 'Storage', data: [5, 6, 7, 8, 7, 8, 9, 8, 10, 9, 10, 11] },
            ]}
            options={{
              chart: { 
                toolbar: { show: false }, 
                foreColor: '#6b7280',
                fontFamily: 'Inter, sans-serif'
              },
              grid: { 
                borderColor: '#e5e7eb',
                strokeDashArray: 2
              },
              dataLabels: { enabled: false },
              stroke: { curve: 'smooth', width: 3 },
              xaxis: { 
                categories: Array.from({ length: 12 }, (_, i) => `W${i + 1}`),
                axisBorder: { show: false },
                axisTicks: { show: false }
              },
              yaxis: {
                labels: {
                  formatter: (val) => val.toFixed(0)
                }
              },
              colors: ['#2F80ED', '#56CCF2'],
              legend: { 
                position: 'top',
                horizontalAlign: 'left',
                fontSize: '14px',
                fontWeight: 500
              },
              fill: { 
                type: 'gradient', 
                gradient: { 
                  opacityFrom: 0.4, 
                  opacityTo: 0.1,
                  stops: [0, 100]
                } 
              },
              tooltip: { 
                theme: 'dark',
                style: {
                  fontSize: '12px'
                }
              },
            }}
          />
        </div>
      </div>
    </div>
  )
}

