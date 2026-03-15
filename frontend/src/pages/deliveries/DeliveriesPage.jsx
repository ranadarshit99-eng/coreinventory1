import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, Truck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { formatDate } from '../../utils/helpers'
import SkeletonTable from '../../components/ui/SkeletonTable'

export default function DeliveriesPage() {
  const navigate = useNavigate()
  const [deliveries, setDeliveries] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const { data } = await api.get('/deliveries/', { params })
      setDeliveries(data)
    } catch { toast.error('Failed to load deliveries') }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  const STATUSES = ['all', 'draft', 'ready', 'done', 'canceled']

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Delivery Orders</div>
          <div className="page-subtitle">Track outgoing stock to customers</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn btn-primary" onClick={() => navigate('/deliveries/new')}>
            <Plus size={15} /> New Delivery
          </button>
        </div>
      </div>

      <div className="filters-bar">
        {STATUSES.map(s => (
          <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? <SkeletonTable rows={6} cols={5} /> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Reference</th><th>Customer</th><th>Warehouse</th><th>Step</th><th>Status</th><th>Scheduled</th><th>Lines</th></tr>
            </thead>
            <tbody>
              {deliveries.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <Truck size={36} />
                    <h3>No deliveries found</h3>
                    <p>Create a delivery order to start dispatching goods</p>
                    <button className="btn btn-primary" onClick={() => navigate('/deliveries/new')}><Plus size={14} /> New Delivery</button>
                  </div>
                </td></tr>
              )}
              {deliveries.map(d => (
                <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/deliveries/${d.id}`)}>
                  <td><span className="font-mono" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{d.reference}</span></td>
                  <td style={{ fontWeight: 500 }}>{d.customer}</td>
                  <td className="text-muted">{d.warehouse_name}</td>
                  <td><span className="badge badge-ready" style={{ textTransform: 'capitalize' }}>{d.step}</span></td>
                  <td><span className={`badge badge-${d.status}`}>{d.status}</span></td>
                  <td className="text-muted">{formatDate(d.scheduled_date)}</td>
                  <td className="text-muted">{d.lines_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
