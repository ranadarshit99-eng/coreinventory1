import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Package, AlertTriangle, XCircle, ClipboardList, Truck,
  TrendingUp, TrendingDown, ArrowRight, RefreshCw
} from 'lucide-react'
import api from '../utils/api'
import { formatDate, formatNumber } from '../utils/helpers'
import SkeletonTable from '../components/ui/SkeletonTable'
import './Dashboard.css'

const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status}`}>{status}</span>
)

const TypeBadge = ({ type }) => (
  <span className={`badge badge-${type}`}>{type}</span>
)

const KPICard = ({ icon: Icon, label, value, color, sub, loading }) => (
  <div className="kpi-card" style={{ '--kpi-color': color }}>
    <div className="kpi-left">
      <div className="kpi-icon"><Icon size={20} /></div>
      <div>
        <div className="kpi-label">{label}</div>
        {loading
          ? <div className="skeleton" style={{ height: 28, width: 60, marginTop: 4 }} />
          : <div className="kpi-value">{formatNumber(value)}</div>
        }
        {sub && <div className="kpi-sub">{sub}</div>}
      </div>
    </div>
  </div>
)

export default function DashboardPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const { data: d } = await api.get('/dashboard/')
      setData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const kpis = data ? [
    { icon: Package, label: 'Total Products', value: data.kpis.total_products, color: '#0070F2' },
    { icon: AlertTriangle, label: 'Low Stock Items', value: data.kpis.low_stock, color: '#F59E0B', sub: 'Below reorder point' },
    { icon: XCircle, label: 'Out of Stock', value: data.kpis.out_of_stock, color: '#EF4444', sub: 'Zero quantity' },
    { icon: ClipboardList, label: 'Pending Receipts', value: data.kpis.pending_receipts, color: '#7C3AED' },
    { icon: Truck, label: 'Pending Deliveries', value: data.kpis.pending_deliveries, color: '#0EA5E9' },
  ] : []

  return (
    <div className="dashboard">
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-subtitle">Real-time overview of your inventory operations</div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}>
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        {loading
          ? Array(5).fill(0).map((_, i) => (
            <div key={i} className="kpi-card">
              <div className="kpi-left">
                <div className="skeleton kpi-icon-skel" />
                <div>
                  <div className="skeleton" style={{ height: 12, width: 80, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 28, width: 50 }} />
                </div>
              </div>
            </div>
          ))
          : kpis.map((k, i) => <KPICard key={i} {...k} />)
        }
      </div>

      <div className="dashboard-body">
        {/* Recent Operations */}
        <div className="dashboard-main">
          <div className="card">
            <div className="card-header">
              <h3>Recent Operations</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/receipts')}>
                  Receipts <ArrowRight size={12} />
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => navigate('/deliveries')}>
                  Deliveries <ArrowRight size={12} />
                </button>
              </div>
            </div>
            {loading ? <SkeletonTable rows={6} cols={5} /> : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Type</th>
                      <th>Party</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th>Lines</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.recent_operations?.length === 0 && (
                      <tr><td colSpan={6}>
                        <div className="empty-state">
                          <Package size={32} />
                          <h3>No operations yet</h3>
                          <p>Create your first receipt or delivery to get started</p>
                        </div>
                      </td></tr>
                    )}
                    {data?.recent_operations?.map(op => (
                      <tr key={`${op.type}-${op.id}`}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/${op.type === 'receipt' ? 'receipts' : 'deliveries'}/${op.id}`)}>
                        <td><span className="font-mono" style={{ fontSize: 12 }}>{op.reference}</span></td>
                        <td><TypeBadge type={op.type} /></td>
                        <td style={{ maxWidth: 160 }} className="truncate">{op.party}</td>
                        <td><StatusBadge status={op.status} /></td>
                        <td className="text-muted">{formatDate(op.date)}</td>
                        <td className="text-muted">{op.lines_count} item{op.lines_count !== 1 ? 's' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Stock Alerts Panel */}
        <div className="dashboard-side">
          <div className="card">
            <div className="card-header">
              <h3>⚠ Stock Alerts</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/products?status=low_stock')}>
                View all
              </button>
            </div>
            {loading
              ? Array(5).fill(0).map((_, i) => (
                <div key={i} className="alert-item">
                  <div className="skeleton" style={{ height: 12, width: '70%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 10, width: '40%' }} />
                </div>
              ))
              : data?.stock_alerts?.length === 0
                ? <div className="empty-state" style={{ padding: '30px 20px' }}>
                    <Package size={28} />
                    <p>All products are well-stocked</p>
                  </div>
                : data?.stock_alerts?.map(a => (
                  <div key={a.product_id} className="alert-item"
                    onClick={() => navigate(`/products/${a.product_id}`)}
                    style={{ cursor: 'pointer' }}>
                    <div className="alert-item-header">
                      <span className="alert-name">{a.name}</span>
                      <span className={`badge badge-${a.status === 'out' ? 'out_of_stock' : 'low_stock'}`}>
                        {a.status === 'out' ? 'Out' : 'Low'}
                      </span>
                    </div>
                    <div className="alert-item-meta">
                      <span className="font-mono" style={{ fontSize: 11 }}>{a.sku}</span>
                      <span className={a.qty === 0 ? 'text-danger' : 'text-warning'}>
                        {formatNumber(a.qty)} / {formatNumber(a.reorder)} min
                      </span>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>
      </div>
    </div>
  )
}
