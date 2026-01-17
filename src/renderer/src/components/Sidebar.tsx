import React from 'react'
import { Link, useLocation } from 'react-router-dom' // We need to set up router first
import { Library, Settings as SettingsIcon, Home, Zap } from 'lucide-react'
import { clsx } from 'clsx'

interface SidebarItemProps {
  icon: React.ReactNode
  label: string
  to: string
  isActive?: boolean
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, to, isActive }) => {
  return (
    <Link
      to={to}
      className={clsx(
        'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
        isActive
          ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      )}
    >
      <div className={clsx('transition-transform duration-200', isActive ? 'scale-110' : 'group-hover:scale-110')}>
        {icon}
      </div>
      <span className="font-medium">{label}</span>
      {isActive && (
        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,0.8)]" />
      )}
    </Link>
  )
}

export const Sidebar = () => {
  const location = useLocation()

  return (
    <div className="w-64 h-full flex flex-col glass-panel border-r border-white/5 pt-10 pb-6 px-4">
      <div className="mb-10 px-2 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg shadow-blue-900/30">
          <Zap className="w-5 h-5 text-white" fill="currentColor" />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          Kamisama
        </h1>
      </div>

      <nav className="flex-1 space-y-2">
        <SidebarItem
          icon={<Home size={20} />}
          label="Home"
          to="/"
          isActive={location.pathname === '/'}
        />
        <SidebarItem
          icon={<Library size={20} />}
          label="My Mods"
          to="/mods"
          isActive={location.pathname === '/mods'}
        />
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <SidebarItem
          icon={<SettingsIcon size={20} />}
          label="Settings"
          to="/settings"
          isActive={location.pathname === '/settings'}
        />
      </div>
    </div>
  )
}
