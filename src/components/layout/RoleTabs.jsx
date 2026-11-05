import { Link, useLocation } from 'react-router-dom'
import { getTabsForRole } from '@/constants/navigation'
import { useOpenTaskCount } from '@/features/tasks/hooks/useTasks'
import { useSession } from '@/hooks/useSession'

export function RoleTabs() {
  const location = useLocation()
  const { role } = useSession()
  const tabs = getTabsForRole(role)
  const todoCount = useOpenTaskCount(tabs.some((tab) => tab.showTodoCount))

  return (
    <nav className="tabs" aria-label="Sections">
      <div className="wrap">
        {tabs.map((tab) => {
          const active = tab.isActive(location.pathname)
          return (
            <Link
              key={tab.key}
              to={tab.to}
              className="tab"
              aria-current={active ? 'page' : undefined}
            >
              {tab.label}
              {tab.showTodoCount && <span className="tg">{todoCount}</span>}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
