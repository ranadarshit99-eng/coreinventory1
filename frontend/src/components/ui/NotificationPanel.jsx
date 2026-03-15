import React, { useEffect, useRef, useState } from 'react'
import { Package, ClipboardList, X } from 'lucide-react'
import api from '../../utils/api'
import { useNavigate } from 'react-router-dom'

export default function NotificationPanel({ onClose }) {
  const ref = useRef()
  const navigate = useNavigate()
  const [alerts, setAlerts] = useState([])

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [onClose])

  useEffect(() => {
    api.get('/dashboard/').then(({ data }) => {
      const items = []
      data.stock_alerts?.slice(0, 5).forEach(a => {
        items.push({
          id: `stock-${a.product_id}`,
          type: a.status === 'out' ? 'danger' : 'warning',
          icon: 'package',
          title: a.status === 'out' ? `Out of stock: ${a.name}` : `Low stock: ${a.name}`,
          desc: `${a.qty} remaining (min: ${a.reorder})`,
          action: () => { navigate(`/products/${a.product_id}`); onClose() }
        })
      })
      data.recent_operations?.filter(o => o.status === 'waiting' || o.status === 'ready').slice(0, 3).forEach(o => {
        items.push({
          id: `op-${o.type}-${o.id}`,
          type: 'info',
          icon: 'receipt',
          title: `${o.reference} needs attention`,
          desc: `Status: ${o.status} — ${o.party}`,
          action: () => {
            navigate(`/${o.type === 'receipt' ? 'receipts' : 'deliveries'}/${o.id}`)
            onClose()
          }
        })
      })
      setAlerts(items)
    }).catch(() => {})
  }, [])

  return (
    <div ref={ref} style={{
      position: 'absolute', top: '100%', right: 0, marginTop: 8,
      width: 340, background: 'var(--bg-card)',
      border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)',
      boxShadow: 'var(--shadow-lg)', zIndex: 200, overflow: 'hidden',
      animation: 'slideUp 150ms ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>Notifications</span>
        <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}><X size={14} /></button>
      </div>
      <div style={{ maxHeight: 380, overflowY: 'auto' }}>
        {alerts.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
            All clear — no alerts
          </div>
        )}
        {alerts.map(a => (
          <div key={a.id} onClick={a.action} style={{
            display: 'flex', gap: 12, padding: '12px 16px', cursor: 'pointer',
            borderBottom: '1px solid var(--border-light)', transition: 'background 150ms'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
          onMouseLeave={e => e.currentTarget.style.background = ''}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius)', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: a.type === 'danger' ? 'var(--danger-bg)' : a.type === 'warning' ? 'var(--warning-bg)' : 'var(--info-bg)',
              color: a.type === 'danger' ? 'var(--danger)' : a.type === 'warning' ? 'var(--warning)' : 'var(--info)',
            }}>
              {a.icon === 'package' ? <Package size={14} /> : <ClipboardList size={14} />}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{a.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
