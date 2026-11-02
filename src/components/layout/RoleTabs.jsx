import { Link, useLocation } from 'react-router-dom'
import { getTabsForRole } from '@/constants/navigation'
import { useSession } from '@/hooks/useSession'

export function RoleTabs() {
  const location = useLocation()
  const { role, todoCount } = useSession()
  const tabs = getTabsForRole(role)

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
