import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, CheckCircle, XCircle, ArrowRight, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { formatDate } from '../../utils/helpers'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const UOMS = ['pieces', 'kg', 'liters', 'meters', 'boxes', 'pallets', 'rolls', 'sets']
const emptyLine = () => ({ product_id: '', qty: '', uom: 'pieces', _key: Date.now() + Math.random() })
const STEPS = ['pick', 'pack', 'done']
const STEP_LABELS = { pick: 'Pick', pack: 'Pack', done: 'Done' }

export default function DeliveryDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isNew = id === 'new'

  const [delivery, setDelivery] = useState(null)
  const [products, setProducts] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [confirmAction, setConfirmAction] = useState(null)
  const [form, setForm] = useState({
    customer: '', scheduled_date: '', warehouse_id: '', notes: '',
    lines: [emptyLine()]
  })

  useEffect(() => {
    const loadMeta = async () => {
      const [pRes, wRes] = await Promise.all([api.get('/products/'), api.get('/warehouses/')])
      setProducts(pRes.data)
      setWarehouses(wRes.data)
      if (wRes.data.length && isNew) setForm(f => ({ ...f, warehouse_id: wRes.data[0].id }))
    }
    loadMeta()
    if (!isNew) {
      api.get(`/deliveries/${id}`).then(({ data }) => {
        setDelivery(data)
        setForm({
          customer: data.customer,
          scheduled_date: data.scheduled_date ? data.scheduled_date.split('T')[0] : '',
          warehouse_id: data.warehouse_id,
          notes: data.notes || '',
          lines: data.lines.map(l => ({ ...l, _key: l.id }))
        })
      }).catch(() => navigate('/deliveries'))
      .finally(() => setLoading(false))
    }
  }, [id])

  const isEditable = isNew || (delivery && delivery.status === 'draft')
  const setLine = (idx, field, value) => setForm(f => {
    const lines = [...f.lines]; lines[idx] = { ...lines[idx], [field]: value }; return { ...f, lines }
  })
  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, emptyLine()] }))
  const removeLine = (idx) => setForm(f => ({ ...f, lines: f.lines.filter((_, i) => i !== idx) }))

  const handleSave = async () => {
    if (!form.customer || !form.warehouse_id) { toast.error('Customer and warehouse required'); return }
    const validLines = form.lines.filter(l => l.product_id && l.qty > 0)
    if (!validLines.length) { toast.error('Add at least one product line'); return }
    setSaving(true)
    try {
      const payload = {
        customer: form.customer,
        scheduled_date: form.scheduled_date || null,
        warehouse_id: Number(form.warehouse_id),
        notes: form.notes || null,
        lines: validLines.map(l => ({ product_id: Number(l.product_id), qty: Number(l.qty), uom: l.uom }))
      }
      if (isNew) {
        const { data } = await api.post('/deliveries/', payload)
        toast.success('Delivery created')
        navigate(`/deliveries/${data.id}`)
      } else {
        const { data } = await api.put(`/deliveries/${id}`, payload)
        setDelivery(data)
        toast.success('Delivery updated')
      }
    } catch (err) { toast.error(err.response?.data?.detail || 'Save failed') }
    finally { setSaving(false) }
  }

  const handleNextStep = async () => {
    setActionLoading(true)
    try {
      const { data } = await api.post(`/deliveries/${id}/next-step`)
      setDelivery(data)
      const msg = data.step === 'pack' ? 'Items picked — ready to pack'
        : data.status === 'done' ? 'Delivery validated — stock updated!'
        : 'Step advanced'
      toast.success(msg)
      setConfirmAction(null)
    } catch (err) { toast.error(err.response?.data?.detail || 'Action failed') }
    finally { setActionLoading(false) }
  }

  const handleCancel = async () => {
    setActionLoading(true)
    try {
      const { data } = await api.post(`/deliveries/${id}/cancel`)
      setDelivery(data)
      toast.success('Delivery canceled')
      setConfirmAction(null)
    } catch (err) { toast.error(err.response?.data?.detail || 'Cancel failed') }
    finally { setActionLoading(false) }
  }

  if (loading) return <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-lg)' }} />

  const canAdvance = delivery && !['done', 'canceled'].includes(delivery.status)
  const canCancel = delivery && !['done', 'canceled'].includes(delivery.status)
  const nextLabel = delivery?.step === 'pick' ? 'Mark as Packed' : delivery?.step === 'pack' ? 'Validate Delivery' : null

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/deliveries')}><ArrowLeft size={14} /> Deliveries</button>
          <div>
            <div className="page-title">{isNew ? 'New Delivery' : delivery?.reference}</div>
            {delivery && <div className="page-subtitle">{delivery.customer} · {delivery.warehouse_name}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {delivery && <span className={`badge badge-${delivery.status}`} style={{ fontSize: 13, padding: '6px 14px' }}>{delivery.status}</span>}
          {canCancel && <button className="btn btn-secondary btn-sm" onClick={() => setConfirmAction('cancel')}><XCircle size={13} /> Cancel</button>}
          {canAdvance && nextLabel && <button className="btn btn-success" onClick={() => setConfirmAction('next')}><CheckCircle size={13} /> {nextLabel}</button>}
        </div>
      </div>

      {/* 3-step progress bar */}
      {delivery && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 16 }}>
          {STEPS.map((s, i) => {
            const stepIdx = STEPS.indexOf(delivery.step)
            const isActive = delivery.step === s
            const isDone = stepIdx > i || delivery.status === 'done'
            return (
              <React.Fragment key={s}>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%', margin: '0 auto 6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--border)',
                    color: isDone || isActive ? '#fff' : 'var(--text-muted)',
                    fontSize: 12, fontWeight: 700
                  }}>{isDone ? '✓' : i + 1}</div>
                  <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 400,
                    color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {STEP_LABELS[s]}
                  </div>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 0.5, display: 'flex', alignItems: 'center', paddingBottom: 24 }}>
                    <div style={{ height: 2, width: '100%', background: isDone ? 'var(--success)' : 'var(--border)' }} />
                  </div>
                )}
              </React.Fragment>
            )
          })}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20 }}>
        <div>
          <div className="card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Delivery Details</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Customer Name *</label>
                <input value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))}
                  placeholder="Customer name" disabled={!isEditable} />
              </div>
              <div className="form-group">
                <label>Source Warehouse *</label>
                <select value={form.warehouse_id} onChange={e => setForm(f => ({ ...f, warehouse_id: e.target.value }))} disabled={!isEditable}>
                  <option value="">Select</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Delivery Date</label>
                <input type="date" value={form.scheduled_date} onChange={e => setForm(f => ({ ...f, scheduled_date: e.target.value }))} disabled={!isEditable} />
              </div>
              <div className="form-group">
                <label>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" disabled={!isEditable} />
              </div>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700 }}>Product Lines</h3>
              {isEditable && <button className="btn btn-secondary btn-sm" onClick={addLine}><Plus size={13} /> Add Line</button>}
            </div>
            <div className="table-wrapper">
              <table>
                <thead><tr><th style={{ width: '40%' }}>Product</th><th>Qty to Deliver</th><th>UoM</th>{isEditable && <th></th>}</tr></thead>
                <tbody>
                  {form.lines.map((line, idx) => (
                    <tr key={line._key || idx}>
                      <td>
                        <select value={line.product_id} onChange={e => setLine(idx, 'product_id', e.target.value)} disabled={!isEditable}>
                          <option value="">Select product</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                        </select>
                      </td>
                      <td><input type="number" min={0} value={line.qty} onChange={e => setLine(idx, 'qty', e.target.value)} placeholder="0" disabled={!isEditable} style={{ width: 90 }} /></td>
                      <td><select value={line.uom} onChange={e => setLine(idx, 'uom', e.target.value)} disabled={!isEditable} style={{ width: 100 }}>{UOMS.map(u => <option key={u}>{u}</option>)}</select></td>
                      {isEditable && <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => removeLine(idx)} disabled={form.lines.length === 1}><Trash2 size={13} /></button></td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {isEditable && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16, gap: 8 }}>
                <button className="btn btn-secondary" onClick={() => navigate('/deliveries')}>Cancel</button>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader size={13} className="spin" /> : null}
                  {isNew ? 'Save as Draft' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {delivery && (
          <div className="card" style={{ alignSelf: 'start' }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Summary</h3>
            {[
              ['Reference', delivery.reference],
              ['Customer', delivery.customer],
              ['Warehouse', delivery.warehouse_name],
              ['Status', <span className={`badge badge-${delivery.status}`}>{delivery.status}</span>],
              ['Step', <span style={{ textTransform: 'capitalize' }}>{delivery.step}</span>],
              ['Scheduled', formatDate(delivery.scheduled_date)],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border-light)', fontSize: 12 }}>
                <span className="text-muted">{k}</span>
                <span style={{ fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        title={confirmAction === 'cancel' ? 'Cancel Delivery' : delivery?.step === 'pack' ? 'Validate Delivery' : 'Advance Step'}
        message={
          confirmAction === 'cancel'
            ? 'Cancel this delivery order?'
            : delivery?.step === 'pack'
            ? 'This will deduct stock from the warehouse. Action cannot be undone.'
            : 'Mark items as picked from the shelf?'
        }
        confirmLabel={confirmAction === 'cancel' ? 'Cancel Delivery' : delivery?.step === 'pack' ? 'Validate & Deduct Stock' : 'Mark as Picked'}
        danger={confirmAction === 'cancel'}
        loading={actionLoading}
        onConfirm={confirmAction === 'cancel' ? handleCancel : handleNextStep}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  )
}
