// TransfersPage.jsx
import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeftRight, Trash2, Loader, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { formatDate } from '../utils/helpers'
import { Modal } from '../components/ui/Modal'
import SkeletonTable from '../components/ui/SkeletonTable'
import ConfirmDialog from '../components/ui/ConfirmDialog'

const emptyLine = () => ({ product_id: '', qty: '', uom: 'pieces', _key: Date.now() + Math.random() })

export default function TransfersPage() {
  const [transfers, setTransfers] = useState([])
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [validating, setValidating] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ from_warehouse_id: '', to_warehouse_id: '', date: '', notes: '', lines: [emptyLine()] })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, pRes, wRes] = await Promise.all([api.get('/transfers/'), api.get('/products/'), api.get('/warehouses/')])
      setTransfers(tRes.data); setProducts(pRes.data); setWarehouses(wRes.data)
    } catch { toast.error('Load failed') } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const openNew = () => {
    setForm({ from_warehouse_id: warehouses[0]?.id || '', to_warehouse_id: warehouses[1]?.id || '', date: '', notes: '', lines: [emptyLine()] })
    setShowModal(true)
  }
  const setLine = (idx, f, v) => setForm(fm => { const l = [...fm.lines]; l[idx] = { ...l[idx], [f]: v }; return { ...fm, lines: l } })
  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }))
  const removeLine = (idx) => setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))

  const handleSave = async () => {
    if (!form.from_warehouse_id || !form.to_warehouse_id) { toast.error('Both warehouses required'); return }
    if (form.from_warehouse_id === form.to_warehouse_id) { toast.error('Source and destination must differ'); return }
    const validLines = form.lines.filter(l => l.product_id && l.qty > 0)
    if (!validLines.length) { toast.error('Add at least one line'); return }
    setSaving(true)
    try {
      await api.post('/transfers/', {
        from_warehouse_id: Number(form.from_warehouse_id),
        to_warehouse_id: Number(form.to_warehouse_id),
        date: form.date || null, notes: form.notes || null,
        lines: validLines.map(l => ({ product_id: Number(l.product_id), qty: Number(l.qty), uom: l.uom }))
      })
      toast.success('Transfer created'); setShowModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') } finally { setSaving(false) }
  }

  const handleValidate = async (t) => {
    try {
      await api.post(`/transfers/${t.id}/validate`)
      toast.success('Transfer validated — stock moved!'); setValidating(null); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Validation failed') }
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Internal Transfers</div><div className="page-subtitle">Move stock between warehouses</div></div>
        <button className="btn btn-primary" onClick={openNew}><Plus size={15} /> New Transfer</button>
      </div>

      {loading ? <SkeletonTable rows={5} cols={5} /> : (
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Reference</th><th>From</th><th>To</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
              {transfers.length === 0 && <tr><td colSpan={6}><div className="empty-state"><ArrowLeftRight size={36} /><h3>No transfers yet</h3></div></td></tr>}
              {transfers.map(t => (
                <tr key={t.id}>
                  <td><span className="font-mono" style={{ fontSize: 12 }}>{t.reference}</span></td>
                  <td>{t.from_warehouse_name}</td><td>{t.to_warehouse_name}</td>
                  <td><span className={`badge badge-${t.status}`}>{t.status}</span></td>
                  <td className="text-muted">{formatDate(t.date || t.created_at)}</td>
                  <td>{t.status === 'draft' && (
                    <button className="btn btn-success btn-sm" onClick={() => setValidating(t)}><CheckCircle size={13} /> Validate</button>
                  )}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Transfer"
        footer={<><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Create Transfer'}</button></>}>
        <div className="form-row">
          <div className="form-group"><label>From Warehouse *</label>
            <select value={form.from_warehouse_id} onChange={e => setForm(f => ({ ...f, from_warehouse_id: e.target.value }))}>
              <option value="">Select</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select></div>
          <div className="form-group"><label>To Warehouse *</label>
            <select value={form.to_warehouse_id} onChange={e => setForm(f => ({ ...f, to_warehouse_id: e.target.value }))}>
              <option value="">Select</option>{warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select></div>
        </div>
        <div className="form-row">
          <div className="form-group"><label>Date</label><input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
          <div className="form-group"><label>Notes</label><input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <label style={{ margin: 0 }}>Product Lines</label>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={12} /> Add Line</button>
        </div>
        {form.lines.map((line, idx) => (
          <div key={line._key} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 90px 32px', gap: 8, marginBottom: 8 }}>
            <select value={line.product_id} onChange={e => setLine(idx, 'product_id', e.target.value)}>
              <option value="">Product</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" min={0} value={line.qty} onChange={e => setLine(idx, 'qty', e.target.value)} placeholder="Qty" />
            <select value={line.uom} onChange={e => setLine(idx, 'uom', e.target.value)}>
              {['pieces','kg','liters','meters','boxes'].map(u => <option key={u}>{u}</option>)}
            </select>
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)', padding: 4 }} onClick={() => removeLine(idx)} disabled={form.lines.length === 1}><Trash2 size={12} /></button>
          </div>
        ))}
      </Modal>

      <ConfirmDialog open={!!validating} title="Validate Transfer"
        message={`Move stock from ${validating?.from_warehouse_name} to ${validating?.to_warehouse_name}? This cannot be undone.`}
        confirmLabel="Validate & Move Stock"
        onConfirm={() => handleValidate(validating)} onCancel={() => setValidating(null)} />
    </div>
  )
}
