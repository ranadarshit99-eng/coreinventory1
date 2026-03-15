import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, Tag, Warehouse, Settings,
  ClipboardList, Truck, ArrowLeftRight, FileSliders,
  History, Bell, Search, ChevronDown, LogOut, User,
  Users, Menu, X, ChevronRight, Box
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { getInitials } from '../../utils/helpers'
import NotificationPanel from '../ui/NotificationPanel'
import './AppLayout.css'

const navConfig = [
  {
    section: 'Main',
    items: [{ to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true }]
  },
  {
    section: 'Inventory',
    items: [
      { to: '/products', icon: Package, label: 'Products' },
      { to: '/categories', icon: Tag, label: 'Categories' },
    ]
  },
  {
    section: 'Operations',
    items: [
      { to: '/receipts', icon: ClipboardList, label: 'Receipts' },
      { to: '/deliveries', icon: Truck, label: 'Delivery Orders' },
      { to: '/transfers', icon: ArrowLeftRight, label: 'Transfers' },
      { to: '/adjustments', icon: FileSliders, label: 'Adjustments' },
      { to: '/move-history', icon: History, label: 'Move History' },
    ]
  },
  {
    section: 'Config',
    items: [
      { to: '/warehouses', icon: Warehouse, label: 'Warehouses' },
      { to: '/users', icon: Users, label: 'Users', roles: ['admin', 'manager'] },
      { to: '/settings', icon: Settings, label: 'Settings', roles: ['admin', 'manager'] },
    ]
  },
]

export default function AppLayout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [notifOpen, setNotifOpen] = useState(false)
  const [search, setSearch] = useState('')

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/') return 'Dashboard'
    if (path.startsWith('/products')) return 'Products'
    if (path.startsWith('/categories')) return 'Categories'
    if (path.startsWith('/receipts')) return 'Receipts'
    if (path.startsWith('/deliveries')) return 'Delivery Orders'
    if (path.startsWith('/transfers')) return 'Transfers'
    if (path.startsWith('/adjustments')) return 'Inventory Adjustments'
    if (path.startsWith('/move-history')) return 'Move History'
    if (path.startsWith('/warehouses')) return 'Warehouses'
    if (path.startsWith('/settings')) return 'Settings'
    if (path.startsWith('/profile')) return 'My Profile'
    if (path.startsWith('/users')) return 'Users'
    return 'CoreInventory'
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}>
        <div className="sidebar-logo">
          <div className="logo-icon"><Box size={20} /></div>
          {sidebarOpen && <span className="logo-text">CoreInventory</span>}
        </div>

        <nav className="sidebar-nav">
          {navConfig.map(section => {
            const visibleItems = section.items.filter(item =>
              !item.roles || item.roles.includes(user?.role)
            )
            if (visibleItems.length === 0) return null
            return (
              <div key={section.section} className="nav-section">
                {sidebarOpen && <span className="nav-section-label">{section.section}</span>}
                {visibleItems.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.exact}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <item.icon size={16} />
                    {sidebarOpen && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen ? (
            <>
              <div className="user-info" onClick={() => navigate('/profile')}>
                <div className="avatar" style={{ background: user?.avatar_color || '#0070F2' }}>
                  {getInitials(user?.full_name)}
                </div>
                <div className="user-meta">
                  <div className="user-name">{user?.full_name}</div>
                  <div className="user-role">{user?.role}</div>
                </div>
              </div>
              <button className="logout-btn" onClick={handleLogout} title="Logout">
                <LogOut size={15} />
              </button>
            </>
          ) : (
            <button className="logout-btn-compact" onClick={handleLogout} title="Logout">
              <LogOut size={16} />
            </button>
          )}
        </div>
      </aside>

      {/* Main area */}
      <div className="main-area">
        {/* Topbar */}
        <header className="topbar">
          <div className="topbar-left">
            <button className="toggle-btn" onClick={() => setSidebarOpen(v => !v)}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="breadcrumb">
              <span className="breadcrumb-app">CoreInventory</span>
              <ChevronRight size={13} className="breadcrumb-sep" />
              <span className="breadcrumb-page">{getPageTitle()}</span>
            </div>
          </div>

          <div className="topbar-right">
            <div className="search-box">
              <Search size={14} />
              <input
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="notif-wrapper">
              <button className="notif-btn" onClick={() => setNotifOpen(v => !v)}>
                <Bell size={17} />
                <span className="notif-badge">3</span>
              </button>
              {notifOpen && <NotificationPanel onClose={() => setNotifOpen(false)} />}
            </div>

            <div className="topbar-user" onClick={() => navigate('/profile')}>
              <div className="avatar-sm" style={{ background: user?.avatar_color || '#0070F2' }}>
                {getInitials(user?.full_name)}
              </div>
              <span className="topbar-username">{user?.full_name?.split(' ')[0]}</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
