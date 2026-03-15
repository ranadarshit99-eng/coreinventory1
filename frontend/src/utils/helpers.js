import { format, parseISO } from 'date-fns'

export const formatDate = (date, fmt = 'MMM dd, yyyy') => {
  if (!date) return '—'
  try {
    return format(typeof date === 'string' ? parseISO(date) : date, fmt)
  } catch { return '—' }
}

export const formatDateTime = (date) => formatDate(date, 'MMM dd, yyyy HH:mm')

export const formatNumber = (n, decimals = 0) => {
  if (n === null || n === undefined) return '—'
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export const getInitials = (name = '') => {
  return name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

export const statusColor = (status) => {
  const map = {
    draft: '#6B7280', waiting: '#D97706', ready: '#0284C7',
    done: '#059669', canceled: '#DC2626',
  }
  return map[status] || '#6B7280'
}

export const moveTypeColor = (type) => {
  const map = {
    receipt: '#0070F2', delivery: '#C2410C',
    transfer: '#7C3AED', adjustment: '#A21CAF',
  }
  return map[type] || '#6B7280'
}

export const roleLabel = (role) => {
  const map = {
    admin: 'Admin', manager: 'Manager',
    sales: 'Sales Team', warehouse: 'Warehouse Staff', viewer: 'Viewer'
  }
  return map[role] || role
}

export const debounce = (fn, delay = 300) => {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
