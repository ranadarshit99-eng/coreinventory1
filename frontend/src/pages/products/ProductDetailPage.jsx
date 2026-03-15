import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Package, BarChart3, RefreshCw } from 'lucide-react'
import api from '../../utils/api'
import { formatDate, formatNumber } from '../../utils/helpers'

export default function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [moves, setMoves] = useState([])
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [pRes, mRes] = await Promise.all([
          api.get(`/products/${id}`),
          api.get(`/products/${id}/moves`)
        ])
        setProduct(pRes.data)
        setMoves(mRes.data)
      } catch { navigate('/products') }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  if (loading) return (
    <div>
      {[200, 400, 300].map((w, i) => (
        <div key={i} className="skeleton" style={{ height: 16, width: w, marginBottom: 12 }} />
      ))}
    </div>
  )
  if (!product) return null

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products')}>
            <ArrowLeft size={14} /> Products
          </button>
          <div>
            <div className="page-title">{product.name}</div>
            <div className="page-subtitle">
              <span className="font-mono" style={{ fontSize: 12 }}>{product.sku}</span>
              {' · '}
              {product.category_name || 'No Category'}
            </div>
          </div>
        </div>
        <span className={`badge badge-${product.status}`} style={{ fontSize: 13, padding: '6px 14px' }}>
          {product.status === 'in_stock' ? 'In Stock' : product.status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
        </span>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'overview' ? 'active' : ''}`} onClick={() => setTab('overview')}>Overview</div>
        <div className={`tab ${tab === 'moves' ? 'active' : ''}`} onClick={() => setTab('moves')}>Stock Movements ({moves.length})</div>
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Product Information</h3>
            {[
              ['Product Name', product.name],
              ['SKU', <span className="font-mono">{product.sku}</span>],
              ['Category', product.category_name || '—'],
              ['Unit of Measure', product.uom],
              ['Reorder Point', formatNumber(product.reorder_point) + ' ' + product.uom],
              ['Description', product.description || '—'],
              ['Created', formatDate(product.created_at)],
            ].map(([label, val]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
                <span className="text-muted">{label}</span>
                <span style={{ fontWeight: 500 }}>{val}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Stock by Warehouse</h3>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              {formatNumber(product.total_stock)}
              <span style={{ fontSize: 14, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 6 }}>{product.uom}</span>
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 20 }}>Total across all warehouses</div>
            {product.stock_by_warehouse?.length === 0 && (
              <p className="text-muted" style={{ fontSize: 13 }}>No stock in any warehouse</p>
            )}
            {product.stock_by_warehouse?.map(s => (
              <div key={s.warehouse_id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 14px', background: 'var(--bg)', borderRadius: 'var(--radius)',
                marginBottom: 8, fontSize: 13
              }}>
                <span style={{ fontWeight: 500 }}>{s.warehouse_name}</span>
                <span style={{ fontWeight: 700 }}>
                  {formatNumber(s.quantity)} <span className="text-muted" style={{ fontWeight: 400 }}>{product.uom}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'moves' && (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Date</th><th>Type</th><th>Reference</th>
                <th>From</th><th>To</th><th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {moves.length === 0 && (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <BarChart3 size={32} />
                    <h3>No movements recorded</h3>
                    <p>Stock movements will appear here after operations</p>
                  </div>
                </td></tr>
              )}
              {moves.map(m => (
                <tr key={m.id}>
                  <td className="text-muted" style={{ fontSize: 12 }}>{formatDate(m.date, 'MMM dd, yyyy HH:mm')}</td>
                  <td><span className={`badge badge-${m.move_type}`}>{m.move_type}</span></td>
                  <td><span className="font-mono" style={{ fontSize: 12 }}>{m.reference}</span></td>
                  <td className="text-muted">{m.from_warehouse || '—'}</td>
                  <td className="text-muted">{m.to_warehouse || '—'}</td>
                  <td style={{ fontWeight: 700 }}>
                    {m.from_warehouse && !m.to_warehouse ? <span className="text-danger">−</span> : <span className="text-success">+</span>}
                    {formatNumber(m.qty)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
