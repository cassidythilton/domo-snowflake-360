import { useMemo, useState } from 'react'
import { Layout } from './Layout'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { AlertsSidebar } from './AlertsSidebar'
import { CostTab } from './tabs/CostTab'
import { PerformanceTab } from './tabs/PerformanceTab'
import { PipelineTab } from './tabs/PipelineTab'
import { AdoptionTab } from './tabs/AdoptionTab'
import { OptimizationTab } from './tabs/OptimizationTab'

export type TabKey = 'cost' | 'performance' | 'pipeline' | 'adoption' | 'optimization'

export function App() {
  const [tab, setTab] = useState<TabKey>('cost')
  const title = useMemo(() => {
    switch (tab) {
      case 'cost':
        return 'Cost & Credits'
      case 'performance':
        return 'Performance & Reliability'
      case 'pipeline':
        return 'Pipeline Health'
      case 'adoption':
        return 'Adoption & Utilization'
      case 'optimization':
        return 'AI Query Optimization'
    }
  }, [tab])

  return (
    <Layout
      sidebar={<Sidebar active={tab} onChange={setTab} />}
      header={<Topbar title={title} />}
      content={
        tab === 'cost' ? (
          <CostTab />
        ) : tab === 'performance' ? (
          <PerformanceTab />
        ) : tab === 'pipeline' ? (
          <PipelineTab />
        ) : tab === 'adoption' ? (
          <AdoptionTab />
        ) : (
          <OptimizationTab />
        )
      }
      aside={<AlertsSidebar />}
    />
  )
}

