import React, { useEffect, useState, useCallback } from 'react'
import { Download, History, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { formatDate, formatNumber } from '../utils/helpers'
import SkeletonTable from '../components/ui/SkeletonTable'

export default function MoveHistoryPage() {
  const [moves, setMoves] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const TYPES = ['all', 'receipt', 'delivery', 'transfer', 'adjustment']

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (typeFilter !== 'all') params.move_type = typeFilter
      const { data } = await api.get('/moves/', { params })
      setMoves(data)
    } catch { toast.error('Failed to load') } finally { setLoading(false) }
  }, [search, typeFilter])

  useEffect(() => { load() }, [typeFilter])

  const handleExport = () => {
    window.open('/api/moves/export-csv', '_blank')
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Move History</div><div className="page-subtitle">Full ledger of all stock movements</div></div>
        <button className="btn btn-secondary" onClick={handleExport}><Download size={14} /> Export CSV</button>
      </div>
      <div className="filters-bar">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Search product..." style={{ paddingLeft: 30, width: 200 }}
            value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} />
        </div>
        {TYPES.map(t => (
          <button key={t} className={`filter-chip ${typeFilter === t ? 'active' : ''}`} onClick={() => setTypeFilter(t)}>
            {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {loading ? <SkeletonTable rows={8} cols={7} /> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Product</th><th>From</th><th>To</th><th>Qty</th><th>By</th></tr></thead>
            <tbody>
              {moves.length === 0 && <tr><td colSpan={8}><div className="empty-state"><History size={32} /><h3>No movements found</h3></div></td></tr>}
              {moves.map(m => (
                <tr key={m.id}>
                  <td className="text-muted" style={{ fontSize: 11 }}>{formatDate(m.date, 'MMM dd HH:mm')}</td>
                  <td><span className={`badge badge-${m.move_type}`}>{m.move_type}</span></td>
                  <td><span className="font-mono" style={{ fontSize: 11 }}>{m.reference}</span></td>
                  <td style={{ fontWeight: 500 }}>{m.product_name}<br /><span className="text-muted font-mono" style={{ fontSize: 10 }}>{m.product_sku}</span></td>
                  <td className="text-muted">{m.from_warehouse || '—'}</td>
                  <td className="text-muted">{m.to_warehouse || '—'}</td>
                  <td style={{ fontWeight: 700 }}>{formatNumber(m.qty)}</td>
                  <td className="text-muted">{m.done_by || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
