import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, RefreshCw, ClipboardList } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { formatDate, formatNumber } from '../../utils/helpers'
import SkeletonTable from '../../components/ui/SkeletonTable'

const STATUSES = ['all', 'draft', 'waiting', 'ready', 'done', 'canceled']

export default function ReceiptsPage() {
  const navigate = useNavigate()
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {}
      const { data } = await api.get('/receipts/', { params })
      setReceipts(data)
    } catch { toast.error('Failed to load receipts') }
    finally { setLoading(false) }
  }, [statusFilter])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Receipts</div>
          <div className="page-subtitle">Manage incoming stock from suppliers</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn btn-primary" onClick={() => navigate('/receipts/new')}>
            <Plus size={15} /> New Receipt
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

      {loading ? <SkeletonTable rows={6} cols={6} /> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Reference</th><th>Supplier</th><th>Warehouse</th>
                <th>Status</th><th>Scheduled Date</th><th>Items</th>
              </tr>
            </thead>
            <tbody>
              {receipts.length === 0 && (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <ClipboardList size={36} />
                    <h3>No receipts found</h3>
                    <p>Create a receipt to start tracking incoming goods</p>
                    <button className="btn btn-primary" onClick={() => navigate('/receipts/new')}>
                      <Plus size={14} /> New Receipt
                    </button>
                  </div>
                </td></tr>
              )}
              {receipts.map(r => (
                <tr key={r.id} style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/receipts/${r.id}`)}>
                  <td><span className="font-mono" style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600 }}>{r.reference}</span></td>
                  <td style={{ fontWeight: 500 }}>{r.supplier}</td>
                  <td className="text-muted">{r.warehouse_name}</td>
                  <td><span className={`badge badge-${r.status}`}>{r.status}</span></td>
                  <td className="text-muted">{formatDate(r.scheduled_date)}</td>
                  <td className="text-muted">{r.lines_count} line{r.lines_count !== 1 ? 's' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
