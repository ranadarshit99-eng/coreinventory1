import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Warehouse, MapPin, Package } from 'lucide-react'
import api from '../utils/api'
import { formatNumber } from '../utils/helpers'

export default function WarehouseDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [warehouse, setWarehouse] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/warehouses/${id}`)
      .then(({ data }) => setWarehouse(data))
      .catch(() => navigate('/warehouses'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />
  if (!warehouse) return null

  const totalUnits = warehouse.stock?.reduce((s, p) => s + p.quantity, 0) || 0

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/warehouses')}>
            <ArrowLeft size={14} /> Warehouses
          </button>
          <div>
            <div className="page-title">{warehouse.name}</div>
            <div className="page-subtitle" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="font-mono" style={{ fontSize: 11 }}>{warehouse.short_code}</span>
              {warehouse.address && <><span>·</span><MapPin size={11} /><span>{warehouse.address}</span></>}
            </div>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Products Stocked', value: warehouse.stock?.length || 0, icon: Package },
          { label: 'Total Units', value: formatNumber(totalUnits), icon: Warehouse },
          { label: 'Manager', value: warehouse.manager || '—', icon: null, isText: true },
        ].map((card, i) => (
          <div key={i} className="card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: 6 }}>
              {card.label}
            </div>
            <div style={{ fontSize: card.isText ? 15 : 28, fontWeight: 800, color: 'var(--text-primary)' }}>
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {/* Stock table */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700 }}>Stock in this Warehouse</h3>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{warehouse.stock?.length} product{warehouse.stock?.length !== 1 ? 's' : ''}</span>
        </div>
        {warehouse.stock?.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <Package size={36} />
            <h3>No stock here</h3>
            <p>This warehouse has no stock. Add products via receipts or adjustments.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>SKU</th>
                  <th>Quantity</th>
                  <th>UoM</th>
                </tr>
              </thead>
              <tbody>
                {warehouse.stock?.sort((a, b) => b.quantity - a.quantity).map(item => (
                  <tr key={item.product_id} style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/products/${item.product_id}`)}>
                    <td style={{ fontWeight: 500, color: 'var(--accent)' }}>{item.product_name}</td>
                    <td><span className="font-mono" style={{ fontSize: 12 }}>{item.sku}</span></td>
                    <td>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{formatNumber(item.quantity)}</span>
                    </td>
                    <td className="text-muted">{item.uom}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
