import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  LayoutDashboard,
  Globe,
  Network,
  Menu,
  CloudCog,
  Sun,
  Moon,
  Search,
  X,
  ExternalLink,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { authApi } from '../api/client'
import { clsx } from 'clsx'
import { useTheme } from '../context/Theme'

const navItems = [
  { to: '/',        label: 'Dashboard',       icon: LayoutDashboard,  end: true },
  { to: '/tunnels', label: 'Tunnels',          icon: CloudCog },
  { to: '/dns',     label: 'DNS Records',      icon: Globe },
  { to: '/routes',  label: 'Private Routes',   icon: Network },
]

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchOpen, setSearchOpen]   = useState(false)
  const [searchVal, setSearchVal]     = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const navigate  = useNavigate()
  const { theme, toggle } = useTheme()

  const { data: user } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: authApi.me,
  })

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const searchRoutes = [
    { label: 'Dashboard',      path: '/' },
    { label: 'Tunnels',        path: '/tunnels' },
    { label: 'New Tunnel',     path: '/tunnels/new' },
    { label: 'DNS Records',    path: '/dns' },
    { label: 'Private Routes', path: '/routes' },
  ]

  const filteredSearch = searchVal.trim()
    ? searchRoutes.filter(r => r.label.toLowerCase().includes(searchVal.toLowerCase()))
    : searchRoutes

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden animate-fade-in" onClick={() => setSidebarOpen(false)} />
      )}

      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={(e) => e.currentTarget === e.target && setSearchOpen(false)}
        >
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-fade-in-up">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                ref={searchRef}
                type="text"
                placeholder="Search pages..."
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
              />
              <button onClick={() => setSearchOpen(false)} className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="py-2 max-h-64 overflow-y-auto">
              {filteredSearch.map(r => (
                <button
                  key={r.path}
                  onClick={() => { navigate(r.path); setSearchOpen(false); setSearchVal('') }}
                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                >
                  <span className="text-gray-400"></span>
                  {r.label}
                </button>
              ))}
              {filteredSearch.length === 0 && (
                <p className="px-4 py-4 text-sm text-gray-400 text-center">No results for "{searchVal}"</p>
              )}
            </div>
            <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800 flex items-center gap-3 text-xs text-gray-400">
              <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">Enter</span> navigate
              <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono">Esc</span> close
            </div>
          </div>
        </div>
      )}

      <aside className={clsx(
        'fixed inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300',
        'bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
        'lg:static lg:translate-x-0',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="h-16 flex items-center gap-3 px-5 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F6821F] to-[#D4661A] flex items-center justify-center text-white font-bold text-sm shadow-md">
            CF
          </div>
          <div>
            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm leading-tight block">Tunnel Manager</span>
            <span className="text-xs text-gray-400">Cloudflare Zero Trust</span>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-600 uppercase tracking-wider px-3 py-2">Navigation</p>
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-orange-50 dark:bg-orange-950/40 text-[#F6821F]'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200',
              )}
            >
              {({ isActive }) => (
                <>
                  <span className={clsx(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                    isActive ? 'bg-[#F6821F]/10 text-[#F6821F]' : 'bg-gray-100 dark:bg-gray-800',
                  )}>
                    <Icon className="w-4 h-4" />
                  </span>
                  <span className="flex-1">{label}</span>
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#F6821F]" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-semibold text-xs shrink-0">
              {(user?.email?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">{user?.email ?? ' - '}</p>
              <p className="text-xs text-gray-400">Authenticated</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 lg:px-6 gap-3 sticky top-0 z-10 transition-colors">
          <button
            className="lg:hidden p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-150 min-w-[160px]"
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="text-xs">Search</span>
            <span className="ml-auto text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded font-mono hidden sm:block">Ctrl K</span>
          </button>

          <div className="flex-1" />

          <a
            href="https://dash.cloudflare.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            CF Dashboard <ExternalLink className="w-3 h-3" />
          </a>

          <button
            onClick={toggle}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-yellow-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
