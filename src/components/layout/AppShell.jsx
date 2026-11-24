import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { RoleTabs } from './RoleTabs'
import { Footer } from './Footer'

export function AppShell({ children }) {
  return (
    <>
      <Header />
      <RoleTabs />
      <main className="wrap">
        {children || <Outlet />}
        <Footer />
      </main>
    </>
  )
}
