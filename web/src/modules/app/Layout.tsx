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
    <div className="grid h-screen grid-cols-[260px_1fr_340px] grid-rows-[auto_1fr]">
      <aside className="row-span-2 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {sidebar}
      </aside>
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]">{header}</header>
      <main className="overflow-auto p-6">{content}</main>
      <aside className="border-l border-[hsl(var(--border))] bg-[hsl(var(--card))]">{aside}</aside>
    </div>
  )
}

