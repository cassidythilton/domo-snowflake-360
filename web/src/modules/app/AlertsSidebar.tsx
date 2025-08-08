import { X, AlertTriangle, Info, Clock } from 'lucide-react'

const alerts = [
  {
    type: 'warning' as const,
    title: 'Stale Dataset',
    description: 'SALESFORCE_ACCOUNTS.WILDCAT hasn\'t been updated for 38 hours',
    timestamp: '8/8/2025, 2:26:47 PM'
  },
  {
    type: 'info' as const,
    title: 'Stale Dataset',
    description: 'forecastRecord hasn\'t been updated for 26 hours',
    timestamp: '8/8/2025, 2:26:47 PM'
  },
  {
    type: 'warning' as const,
    title: 'Stale Dataset',
    description: 'rootCauseRecord hasn\'t been updated for 165 hours',
    timestamp: '8/8/2025, 2:26:47 PM'
  },
  {
    type: 'info' as const,
    title: 'High-Impact Optimizations Available',
    description: '24 queries show >50% performance improvement potential',
    timestamp: '8/8/2025, 2:26:47 PM'
  },
  {
    type: 'error' as const,
    title: 'Connector SLA Breach',
    description: 'Raider Accounts had 7 SLA breaches',
    timestamp: '8/8/2025, 2:26:47 PM'
  }
]

export function AlertsSidebar() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Alerts & Recommendations</h2>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <div className="flex-1 space-y-4 overflow-y-auto">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-l-4 transition-all duration-200 hover:shadow-sm hover:-translate-y-0.5 ${
              alert.type === 'error'
                ? 'border-l-blue-600 bg-gradient-to-r from-blue-50 to-white'
                : alert.type === 'warning'
                ? 'border-l-cyan-500 bg-gradient-to-r from-cyan-50 to-white'
                : 'border-l-cyan-400 bg-gradient-to-r from-cyan-25 to-white'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-1 rounded-full ${
                alert.type === 'error'
                  ? 'bg-blue-100'
                  : alert.type === 'warning'
                  ? 'bg-cyan-100'
                  : 'bg-cyan-100'
              }`}>
                {alert.type === 'error' ? (
                  <AlertTriangle className="w-4 h-4 text-blue-600" />
                ) : alert.type === 'warning' ? (
                  <Clock className="w-4 h-4 text-cyan-600" />
                ) : (
                  <Info className="w-4 h-4 text-cyan-600" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-semibold text-sm mb-1 ${
                  alert.type === 'error'
                    ? 'text-blue-800'
                    : alert.type === 'warning'
                    ? 'text-cyan-800'
                    : 'text-cyan-800'
                }`}>
                  {alert.title}
                </h3>
                <p className={`text-sm leading-relaxed mb-2 ${
                  alert.type === 'error'
                    ? 'text-blue-700'
                    : alert.type === 'warning'
                    ? 'text-cyan-700'
                    : 'text-cyan-700'
                }`}>
                  {alert.description}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  {alert.timestamp}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button className="w-full mt-6 px-4 py-2 text-sm text-cyan-700 hover:text-cyan-800 font-medium border border-cyan-200 rounded-lg hover:bg-cyan-50 transition-colors">
        Show more alerts
      </button>
    </div>
  )
}
