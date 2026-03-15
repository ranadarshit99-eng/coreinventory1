import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, CheckCircle, XCircle, Send, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { formatDate, formatNumber } from '../../utils/helpers'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const UOMS = ['pieces', 'kg', 'liters', 'meters', 'boxes', 'pallets', 'rolls', 'sets']
const emptyLine = () => ({ product_id: '', expected_qty: '', received_qty: '', uom: 'pieces', _key: Date.now() })

export default function ReceiptDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [receipt, setReceipt] = useState(null)
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  const [form, setForm] = useState({
    supplier: '', scheduled_date: '', warehouse_id: '', notes: '',
    lines: [emptyLine()]
  })

  useEffect(() => {
    const loadMeta = async () => {
      const [pRes, wRes] = await Promise.all([
        api.get('/products/'),
        api.get('/warehouses/')
      ])
      setProducts(pRes.data)
      setWarehouses(wRes.data)
      if (wRes.data.length && isNew) {
        setForm(f => ({ ...f, warehouse_id: wRes.data[0].id }))
      }
    }
    loadMeta()

    if (!isNew) {
      api.get(`/receipts/${id}`).then(({ data }) => {
        setReceipt(data)
        setForm({
          supplier: data.supplier,
          scheduled_date: data.scheduled_date ? data.scheduled_date.split('T')[0] : '',
          warehouse_id: data.warehouse_id,
          notes: data.notes || '',
          lines: data.lines.map(l => ({ ...l, _key: l.id }))
        })
      }).catch(() => navigate('/receipts'))
      .finally(() => setLoading(false))
    }
  }, [id])

  const isEditable = isNew || (receipt && !['done', 'canceled'].includes(receipt.status))

  const setLine = (idx, field, value) => {
    setForm(f => {
      const lines = [...f.lines]
      lines[idx] = { ...lines[idx], [field]: value }
      return { ...f, lines }
    })
  }
  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }))
  const removeLine = (idx) => setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))

  const handleSave = async () => {
    if (!form.supplier || !form.warehouse_id) { toast.error('Supplier and warehouse are required'); return }
    const validLines = form.lines.filter(l => l.product_id && l.expected_qty > 0)
    if (validLines.length === 0) { toast.error('Add at least one product line'); return }
    setSaving(true)
    try {
      const payload = {
        supplier: form.supplier,
        scheduled_date: form.scheduled_date || null,
        warehouse_id: Number(form.warehouse_id),
        notes: form.notes || null,
        lines: validLines.map(l => ({
          product_id: Number(l.product_id),
          expected_qty: Number(l.expected_qty),
          received_qty: Number(l.received_qty) || 0,
          uom: l.uom
        }))
      }
      if (isNew) {
        const { data } = await api.post('/receipts/', payload)
        toast.success('Receipt created')
        navigate(`/receipts/${data.id}`)
      } else {
        const { data } = await api.put(`/receipts/${id}`, payload)
        setReceipt(data)
        toast.success('Receipt updated')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  const doAction = async (action) => {
    setActionLoading(action)
    try {
      const { data } = await api.post(`/receipts/${id}/${action}`)
      setReceipt(data)
      toast.success(`Receipt ${action === 'validate' ? 'validated — stock updated!' : action + 'ed'}`)
      setConfirmAction(null)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed')
    } finally { setActionLoading('') }
  }

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />

  const status = receipt?.status
  const canConfirm = status === 'draft'
  const canValidate = status === 'draft' || status === 'waiting' || status === 'ready'
  const canCancel = status && !['done', 'canceled'].includes(status)

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/receipts')}>
            <ArrowLeft size={14} /> Receipts
          </button>
          <div>
            <div className="page-title">
              {isNew ? 'New Receipt' : receipt?.reference}
            </div>
            {receipt && <div className="page-subtitle">{receipt.supplier} · {receipt.warehouse_name}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {receipt && <span className={`badge badge-${status}`} style={{ fontSize: 13, padding: '6px 14px' }}>{status}</span>}
          {canCancel && <button className="btn btn-secondary btn-sm" onClick={() => setConfirmAction('cancel')}><XCircle size={13} /> Cancel</button>}
          {canConfirm && <button className="btn btn-secondary" onClick={() => setConfirmAction('confirm')}><Send size={13} /> Confirm</button>}
          {canValidate && <button className="btn btn-success" onClick={() => setConfirmAction('validate')}><CheckCircle size={13} /> Validate</button>}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
        <div>
          {/* Header fields */}
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Receipt Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Supplier Name *</label>
                <input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))}
                  placeholder="Supplier name" disabled={!isEditable} />
              </div>
              <div className="form-group">
                <label>Source Warehouse *</label>
                <select value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} disabled={!isEditable}>
                  <option value="">Select warehouse</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Scheduled Date</label>
                <input type="date" value={form.scheduled_date}
                  onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} disabled={!isEditable} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Optional notes" disabled={!isEditable} />
              </div>
            </div>
          </div>

          {/* Product lines */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700 }}>Product Lines</h3>
              {isEditable && <button className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={13} /> Add Line</button>}
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '35%' }}>Product</th>
                    <th>Expected Qty</th>
                    <th>Received Qty</th>
                    <th>UoM</th>
                    {isEditable && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {form.lines.map((line, idx) => (
                    <tr key={line._key || idx}>
                      <td>
                        <select value={line.product_id} onChange={e => setLine(idx, 'product_id', e.target.value)} disabled={!isEditable}>
                          <option value="">Select product</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                        </select>
                      </td>
                      <td>
                        <input type="number" min={0} value={line.expected_qty}
                          onChange={e => setLine(idx, 'expected_qty', e.target.value)}
                          placeholder="0" disabled={!isEditable} style={{ width: 90 }} />
                      </td>
                      <td>
                        <input type="number" min={0} value={line.received_qty}
                          onChange={e => setLine(idx, 'received_qty', e.target.value)}
                          placeholder="0" disabled={!isEditable} style={{ width: 90 }} />
                      </td>
                      <td>
                        <select value={line.uom} onChange={e => setLine(idx, 'uom', e.target.value)} disabled={!isEditable} style={{ width: 100 }}>
                          {UOMS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      {isEditable && (
                        <td>
                          <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                            onClick={() => removeLine(idx)} disabled={form.lines.length === 1}>
                            <Trash2 size={13} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isEditable && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => navigate('/receipts')}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader size={13} className="spin" /> : null}
                  {isNew ? 'Save as Draft' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar info */}
        {receipt && (
          <div>
            <div className="card">
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Summary</h3>
              {[
                ['Reference', receipt.reference],
                ['Supplier', receipt.supplier],
                ['Warehouse', receipt.warehouse_name],
                ['Status', <span className={`badge badge-${status}`}>{status}</span>],
                ['Scheduled', formatDate(receipt.scheduled_date)],
                ['Created', formatDate(receipt.created_at)],
                ['Total Units', formatNumber(receipt.total_units)],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}>
                  <span className="text-muted">{k}</span>
                  <span style={{ fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Workflow steps */}
            <div className="card" style={{ marginTop: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Workflow</h3>
              {['draft', 'waiting', 'done'].map((s, i) => (
                <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                    background: status === s ? 'var(--accent)' :
                      (['draft','waiting','done'].indexOf(status) > i) ? 'var(--success)' : 'var(--border)',
                    color: status === s || (['draft','waiting','done'].indexOf(status) > i) ? '#fff' : 'var(--text-muted)'
                  }}>{i + 1}</div>
                  <span style={{ fontSize: 12, fontWeight: status === s ? 600 : 400,
                    color: status === s ? 'var(--text-primary)' : 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {s === 'waiting' ? 'Confirmed' : s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction === 'validate' ? 'Validate Receipt' : confirmAction === 'confirm' ? 'Confirm Receipt' : 'Cancel Receipt'}
        message={
          confirmAction === 'validate'
            ? 'This will update stock levels for all product lines. This action cannot be undone.'
            : confirmAction === 'confirm'
            ? 'Mark this receipt as confirmed and ready for validation?'
            : 'Cancel this receipt? Stock will not be updated.'
        }
        confirmLabel={confirmAction === 'validate' ? 'Validate & Update Stock' : confirmAction === 'confirm' ? 'Confirm' : 'Cancel Receipt'}
        danger={confirmAction === 'cancel'}
        loading={!!actionLoading}
        onConfirm={() => doAction(confirmAction)}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
