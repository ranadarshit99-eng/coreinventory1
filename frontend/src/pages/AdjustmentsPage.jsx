import React, { useEffect, useState, useCallback } from 'react'
import { Plus, FileSliders, Trash2, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { formatDate, formatNumber } from '../utils/helpers'
import { Modal } from '../components/ui/Modal'
import SkeletonTable from '../components/ui/SkeletonTable'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const REASONS = ['Physical Count', 'Damage', 'Theft', 'Correction', 'Other']
const emptyLine = () => ({ product_id: '', counted_qty: '', _key: Date.now() + Math.random() })

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [validating, setValidating] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ warehouse_id: '', reason: 'Physical Count', date: '', notes: '', lines: [emptyLine()] })
  const [productStocks, setProductStocks] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, pRes, wRes] = await Promise.all([api.get('/adjustments/'), api.get('/products/'), api.get('/warehouses/')])
      setAdjustments(aRes.data); setProducts(pRes.data); setWarehouses(wRes.data)
    } catch { toast.error('Load failed') } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm({ warehouse_id: warehouses[0]?.id || '', reason: 'Physical Count', date: '', notes: '', lines: [emptyLine()] })
    setProductStocks({})
    setShowModal(true)
  }

  const setLine = (idx, f, v) => {
    setForm(fm => { const l = [...fm.lines]; l[idx] = { ...l[idx], [f]: v }; return { ...fm, lines: l } })
    if (f === 'product_id' && v && form.warehouse_id) {
      // Find system qty from products list
      const p = products.find(p => p.id === Number(v))
      if (p) {
        const s = p.stock_by_warehouse?.find(s => s.warehouse_id === Number(form.warehouse_id))
        setProductStocks(prev => ({ ...prev, [idx]: s?.quantity || 0 }))
      }
    }
  }
  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }))
  const removeLine = (idx) => setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))

  const handleSave = async () => {
    if (!form.warehouse_id) { toast.error('Select a warehouse'); return }
    const validLines = form.lines.filter(l => l.product_id && l.counted_qty !== '')
    if (!validLines.length) { toast.error('Add at least one line'); return }
    setSaving(true)
    try {
      await api.post('/adjustments/', {
        warehouse_id: Number(form.warehouse_id), reason: form.reason,
        date: form.date || null, notes: form.notes || null,
        lines: validLines.map(l => ({ product_id: Number(l.product_id), counted_qty: Number(l.counted_qty) }))
      })
      toast.success('Adjustment created'); setShowModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const handleValidate = async (a) => {
    try {
      await api.post(`/adjustments/${a.id}/validate`)
      toast.success('Adjustment validated — stock updated!'); setValidating(null); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Inventory Adjustments</div><div className="page-subtitle">Reconcile physical counts with system data</div></div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Adjustment</button>
      </div>

      {loading ? <SkeletonTable rows={5} cols={5} /> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Reference</th><th>Warehouse</th><th>Reason</th><th>Status</th><th>Date</th><th>Lines</th><th>Actions</th></tr></thead>
            <tbody>
              {adjustments.length === 0 && <tr><td colSpan={7}><div className="empty-state"><FileSliders size={36} /><h3>No adjustments yet</h3></div></td></tr>}
              {adjustments.map(a => (
                <tr key={a.id}>
                  <td><span className="font-mono" style={{ fontSize: 12 }}>{a.reference}</span></td>
                  <td>{a.warehouse_name}</td><td>{a.reason}</td>
                  <td><span className={`badge badge-${a.status}`}>{a.status}</span></td>
                  <td className="text-muted">{formatDate(a.date || a.created_at)}</td>
                  <td className="text-muted">{a.lines?.length}</td>
                  <td>{a.status === 'draft' && (
                    <button className="btn btn-success btn-sm" onClick={() => setValidating(a)}><CheckCircle size={13} /> Validate</button>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Inventory Adjustment"
        footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label>Warehouse *</label>
            <select value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))}>
              <option value="">Select</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select></div>
          <div className="form-group"><label>Reason</label>
            <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}>
              {REASONS.map(r => <option key={r}>{r}</option>)}
            </select></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div className="form-group"><label>Notes</label><input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <label style={{ margin: 0 }}>Product Lines</label>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={12} /> Add Line</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Product</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>System Qty</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Counted Qty</th>
              <th style={{ textAlign: 'left', padding: '4px 8px', color: 'var(--text-muted)', fontWeight: 600 }}>Diff</th>
              <th></th>
            </tr></thead>
            <tbody>
              {form.lines.map((line, idx) => {
                const sysQty = productStocks[idx] || 0
                const diff = line.counted_qty !== '' ? Number(line.counted_qty) - sysQty : null
                return (
                  <tr key={line._key}>
                    <td style={{ padding: '4px 4px 4px 0' }}>
                      <select value={line.product_id} onChange={e => setLine(idx, 'product_id', e.target.value)} style={{ width: '100%' }}>
                        <option value="">Product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '4px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{sysQty}</td>
                    <td style={{ padding: '4px' }}><input type="number" min={0} value={line.counted_qty} onChange={e => setLine(idx, 'counted_qty', e.target.value)} placeholder="0" style={{ width: 80 }} /></td>
                    <td style={{ padding: '4px', fontWeight: 700, color: diff === null ? 'inherit' : diff > 0 ? 'var(--success)' : diff < 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {diff !== null ? (diff > 0 ? `+${diff}` : diff) : '—'}
                    </td>
                    <td><button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: 4 }} onClick={() => removeLine(idx)} disabled={form.lines.length === 1}><Trash2 size={12} /></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Modal>

      <ConfirmDialog open={!!validating} title="Validate Adjustment"
        message="Update stock quantities to match the counted values? This will permanently change stock levels."
        confirmLabel="Validate & Update Stock"
        onConfirm={() => handleValidate(validating)} onCancel={() => setValidating(null)} />
    </div>
  )
}
