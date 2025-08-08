import { ReactNode } from 'react'

export function Layout({
  sidebar,
  header,
  content,
  aside,
}: {
  sidebar: ReactNode
  header: ReactNode
  content: ReactNode
  aside: ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        {sidebar}
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-8 py-6">
          {header}
        </header>
        <main className="flex-1 overflow-auto bg-gray-50 p-8">
          {content}
        </main>
      </div>
      <aside className="w-80 bg-white border-l border-gray-200 p-6 overflow-y-auto">
        {aside}
      </aside>
    </div>
  )
}

