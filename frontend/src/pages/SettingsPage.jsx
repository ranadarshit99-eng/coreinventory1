import React, { useEffect, useState } from 'react'
import { Settings, Save, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'

const CURRENCIES = ['$', '€', '£', '₹', '¥', '₣', 'CHF']
const DATE_FORMATS = ['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']

export default function SettingsPage() {
  const [form, setForm] = useState({
    company_name: '', default_warehouse_id: '', low_stock_threshold: 10, currency: '$', date_format: 'MM/DD/YYYY'
  })
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [sRes, wRes] = await Promise.all([api.get('/settings/'), api.get('/warehouses/')])
        setForm({
          company_name: sRes.data.company_name || '',
          default_warehouse_id: sRes.data.default_warehouse_id || '',
          low_stock_threshold: sRes.data.low_stock_threshold ?? 10,
          currency: sRes.data.currency || '$',
          date_format: sRes.data.date_format || 'MM/DD/YYYY',
        })
        setWarehouses(wRes.data)
      } catch { toast.error('Failed to load settings') }
      finally { setLoading(false) }
    }
    load()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/settings/', {
        company_name: form.company_name,
        default_warehouse_id: form.default_warehouse_id ? Number(form.default_warehouse_id) : null,
        low_stock_threshold: Number(form.low_stock_threshold),
        currency: form.currency,
        date_format: form.date_format,
      })
      toast.success('Settings saved successfully')
    } catch { toast.error('Failed to save settings') }
    finally { setSaving(false) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (loading) return (
    <div>{[240, 400, 300, 200].map((w, i) => (
      <div key={i} className="skeleton" style={{ height: 14, width: w, marginBottom: 14 }} />
    ))}</div>
  )

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Configure your CoreInventory workspace</div>
        </div>
      </div>

      <form onSubmit={handleSave}>
        <div className="card" style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings size={15} /> General Settings
          </h3>

          <div className="form-group">
            <label>Company Name</label>
            <input
              value={form.company_name}
              onChange={e => set('company_name', e.target.value)}
              placeholder="Your company name"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Default Warehouse</label>
              <select value={form.default_warehouse_id} onChange={e => set('default_warehouse_id', e.target.value)}>
                <option value="">None selected</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Used as default when creating operations
              </div>
            </div>
            <div className="form-group">
              <label>Low Stock Threshold</label>
              <input
                type="number"
                min={0}
                value={form.low_stock_threshold}
                onChange={e => set('low_stock_threshold', e.target.value)}
                placeholder="10"
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Global fallback reorder point
              </div>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Currency Symbol</label>
              <select value={form.currency} onChange={e => set('currency', e.target.value)}>
                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Date Format</label>
              <select value={form.date_format} onChange={e => set('date_format', e.target.value)}>
                {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <Loader size={15} className="spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  )
}
