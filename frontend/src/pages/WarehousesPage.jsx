import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Warehouse, Edit, Trash2, MapPin, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { formatNumber } from '../utils/helpers'
import { Modal } from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import SkeletonTable from '../components/ui/SkeletonTable'

const LOCATION_TYPES = ['internal', 'input', 'output', 'virtual']

export default function WarehousesPage() {
  const navigate = useNavigate()
  const [warehouses, setWarehouses] = useState([])
  const [locations, setLocations] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('warehouses')

  // Warehouse modal state
  const [whModal, setWhModal] = useState(false)
  const [editWh, setEditWh] = useState(null)
  const [deleteWh, setDeleteWh] = useState(null)
  const [whForm, setWhForm] = useState({ name: '', short_code: '', address: '', manager: '' })
  const [whSaving, setWhSaving] = useState(false)
  const [whDeleting, setWhDeleting] = useState(false)

  // Location modal state
  const [locModal, setLocModal] = useState(false)
  const [editLoc, setEditLoc] = useState(null)
  const [deleteLoc, setDeleteLoc] = useState(null)
  const [locForm, setLocForm] = useState({ name: '', warehouse_id: '', location_type: 'internal' })
  const [locSaving, setLocSaving] = useState(false)
  const [locDeleting, setLocDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [wRes, lRes] = await Promise.all([
        api.get('/warehouses/'),
        api.get('/locations/')
      ])
      setWarehouses(wRes.data)
      setLocations(lRes.data)
    } catch { toast.error('Failed to load') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  // Warehouse CRUD
  const openCreateWh = () => {
    setEditWh(null)
    setWhForm({ name: '', short_code: '', address: '', manager: '' })
    setWhModal(true)
  }
  const openEditWh = (w) => {
    setEditWh(w)
    setWhForm({ name: w.name, short_code: w.short_code, address: w.address || '', manager: w.manager || '' })
    setWhModal(true)
  }
  const saveWh = async () => {
    if (!whForm.name || !whForm.short_code) { toast.error('Name and short code required'); return }
    setWhSaving(true)
    try {
      if (editWh) {
        await api.put(`/warehouses/${editWh.id}`, whForm)
        toast.success('Warehouse updated')
      } else {
        await api.post('/warehouses/', whForm)
        toast.success('Warehouse created')
      }
      setWhModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setWhSaving(false) }
  }
  const deleteWhConfirm = async () => {
    setWhDeleting(true)
    try {
      await api.delete(`/warehouses/${deleteWh.id}`)
      toast.success('Warehouse deleted')
      setDeleteWh(null); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setWhDeleting(false) }
  }

  // Location CRUD
  const openCreateLoc = () => {
    setEditLoc(null)
    setLocForm({ name: '', warehouse_id: warehouses[0]?.id || '', location_type: 'internal' })
    setLocModal(true)
  }
  const openEditLoc = (l) => {
    setEditLoc(l)
    setLocForm({ name: l.name, warehouse_id: l.warehouse_id, location_type: l.location_type })
    setLocModal(true)
  }
  const saveLoc = async () => {
    if (!locForm.name || !locForm.warehouse_id) { toast.error('Name and warehouse required'); return }
    setLocSaving(true)
    try {
      if (editLoc) {
        await api.put(`/locations/${editLoc.id}`, locForm)
        toast.success('Location updated')
      } else {
        await api.post('/locations/', { ...locForm, warehouse_id: Number(locForm.warehouse_id) })
        toast.success('Location created')
      }
      setLocModal(false); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setLocSaving(false) }
  }
  const deleteLocConfirm = async () => {
    setLocDeleting(true)
    try {
      await api.delete(`/locations/${deleteLoc.id}`)
      toast.success('Location deleted')
      setDeleteLoc(null); load()
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed') }
    finally { setLocDeleting(false) }
  }

  const locTypeColor = (t) => ({ internal: 'var(--accent)', input: 'var(--success)', output: 'var(--warning)', virtual: 'var(--text-muted)' }[t] || 'var(--text-muted)')

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Warehouses & Locations</div>
          <div className="page-subtitle">Manage storage facilities and zones</div>
        </div>
        <button
          className="btn btn-primary"
          onClick={tab === 'warehouses' ? openCreateWh : openCreateLoc}
        >
          <Plus size={15} /> {tab === 'warehouses' ? 'New Warehouse' : 'New Location'}
        </button>
      </div>

      <div className="tabs">
        <div className={`tab ${tab === 'warehouses' ? 'active' : ''}`} onClick={() => setTab('warehouses')}>
          <Warehouse size={14} /> Warehouses ({warehouses.length})
        </div>
        <div className={`tab ${tab === 'locations' ? 'active' : ''}`} onClick={() => setTab('locations')}>
          <MapPin size={14} /> Locations ({locations.length})
        </div>
      </div>

      {/* Warehouses tab */}
      {tab === 'warehouses' && (
        loading ? <SkeletonTable rows={4} cols={5} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {warehouses.length === 0 && (
              <div className="empty-state" style={{ gridColumn: '1/-1' }}>
                <Warehouse size={36} />
                <h3>No warehouses yet</h3>
                <p>Add your first warehouse to start managing stock locations</p>
                <button className="btn btn-primary" onClick={openCreateWh}><Plus size={14} /> Add Warehouse</button>
              </div>
            )}
            {warehouses.map(w => (
              <div key={w.id} className="card" style={{ cursor: 'pointer', transition: 'box-shadow 150ms, transform 150ms' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = '' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 38, height: 38, background: 'var(--accent-light)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
                      <Warehouse size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{w.name}</div>
                      <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{w.short_code}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={e => { e.stopPropagation(); openEditWh(w) }}><Edit size={13} /></button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); setDeleteWh(w) }}><Trash2 size={13} /></button>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
                  <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Products</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{w.product_count}</div>
                  </div>
                  <div style={{ background: 'var(--bg)', borderRadius: 'var(--radius)', padding: '8px 12px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 2 }}>Total Units</div>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{formatNumber(w.total_stock)}</div>
                  </div>
                </div>
                {w.manager && <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>Manager: <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{w.manager}</span></div>}
                {w.address && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}><MapPin size={10} style={{ display: 'inline', marginRight: 3 }} />{w.address}</div>}
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 12, width: '100%', justifyContent: 'center' }}
                  onClick={() => navigate(`/warehouses/${w.id}`)}>
                  View Stock Details →
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* Locations tab */}
      {tab === 'locations' && (
        loading ? <SkeletonTable rows={5} cols={4} /> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Location Name</th><th>Warehouse</th><th>Type</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {locations.length === 0 && (
                  <tr><td colSpan={4}>
                    <div className="empty-state">
                      <MapPin size={36} />
                      <h3>No locations yet</h3>
                      <p>Add locations like shelves, zones, or bays within your warehouses</p>
                      <button className="btn btn-primary" onClick={openCreateLoc}><Plus size={14} /> Add Location</button>
                    </div>
                  </td></tr>
                )}
                {locations.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 500 }}>{l.name}</td>
                    <td className="text-muted">{l.warehouse_name}</td>
                    <td>
                      <span style={{
                        background: `${locTypeColor(l.location_type)}18`,
                        color: locTypeColor(l.location_type),
                        padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600, textTransform: 'capitalize'
                      }}>{l.location_type}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEditLoc(l)}><Edit size={13} /></button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setDeleteLoc(l)}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Warehouse Modal */}
      <Modal open={whModal} onClose={() => setWhModal(false)}
        title={editWh ? 'Edit Warehouse' : 'New Warehouse'} size="sm"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setWhModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveWh} disabled={whSaving}>{whSaving ? 'Saving...' : editWh ? 'Update' : 'Create'}</button>
        </>}>
        <div className="form-row">
          <div className="form-group">
            <label>Warehouse Name *</label>
            <input value={whForm.name} onChange={e => setWhForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Main Warehouse" autoFocus />
          </div>
          <div className="form-group">
            <label>Short Code *</label>
            <input value={whForm.short_code} onChange={e => setWhForm(f => ({ ...f, short_code: e.target.value.toUpperCase() }))} placeholder="e.g. MAIN" maxLength={6} />
          </div>
        </div>
        <div className="form-group">
          <label>Address</label>
          <input value={whForm.address} onChange={e => setWhForm(f => ({ ...f, address: e.target.value }))} placeholder="Full address" />
        </div>
        <div className="form-group">
          <label>Manager Name</label>
          <input value={whForm.manager} onChange={e => setWhForm(f => ({ ...f, manager: e.target.value }))} placeholder="Responsible person" />
        </div>
      </Modal>

      {/* Location Modal */}
      <Modal open={locModal} onClose={() => setLocModal(false)}
        title={editLoc ? 'Edit Location' : 'New Location'} size="sm"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setLocModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={saveLoc} disabled={locSaving}>{locSaving ? 'Saving...' : editLoc ? 'Update' : 'Create'}</button>
        </>}>
        <div className="form-group">
          <label>Location Name *</label>
          <input value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Shelf A1, Receiving Bay" autoFocus />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Parent Warehouse *</label>
            <select value={locForm.warehouse_id} onChange={e => setLocForm(f => ({ ...f, warehouse_id: e.target.value }))}>
              <option value="">Select warehouse</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Type</label>
            <select value={locForm.location_type} onChange={e => setLocForm(f => ({ ...f, location_type: e.target.value }))}>
              {LOCATION_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!deleteWh} title="Delete Warehouse"
        message={`Delete "${deleteWh?.name}"? This cannot be undone.`}
        confirmLabel="Delete" danger loading={whDeleting}
        onConfirm={deleteWhConfirm} onCancel={() => setDeleteWh(null)} />
      <ConfirmDialog open={!!deleteLoc} title="Delete Location"
        message={`Delete location "${deleteLoc?.name}"?`}
        confirmLabel="Delete" danger loading={locDeleting}
        onConfirm={deleteLocConfirm} onCancel={() => setDeleteLoc(null)} />
    </div>
  )
}
