import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, RefreshCw, Package, Edit, Archive, Wand2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { formatNumber, debounce } from '../../utils/helpers'
import { Modal } from '../../components/ui/Modal'
import SkeletonTable from '../../components/ui/SkeletonTable'
import ConfirmDialog from '../../components/ui/ConfirmDialog'

const STATUS_FILTERS = ['all', 'in_stock', 'low_stock', 'out_of_stock']
const UOMS = ['pieces', 'kg', 'liters', 'meters', 'boxes', 'pallets', 'rolls', 'sets']

export default function ProductsPage() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [warehouses, setWarehouses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editProduct, setEditProduct] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [form, setForm] = useState({
    name: '', sku: '', category_id: '', uom: 'pieces',
    reorder_point: 10, initial_stock: '', warehouse_id: '', description: ''
  })
  const [errors, setErrors] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (catFilter) params.category_id = catFilter
      if (statusFilter !== 'all') params.status = statusFilter
      const [pRes, cRes, wRes] = await Promise.all([
        api.get('/products/', { params }),
        api.get('/categories/'),
        api.get('/warehouses/')
      ])
      setProducts(pRes.data)
      setCategories(cRes.data)
      setWarehouses(wRes.data)
    } catch (e) { toast.error('Failed to load products') }
    finally { setLoading(false) }
  }, [search, catFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const debouncedSearch = useCallback(debounce(load, 400), [load])

  const openCreate = () => {
    setEditProduct(null)
    setForm({ name: '', sku: '', category_id: '', uom: 'pieces', reorder_point: 10, initial_stock: '', warehouse_id: warehouses[0]?.id || '', description: '' })
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (p) => {
    setEditProduct(p)
    setForm({ name: p.name, sku: p.sku, category_id: p.category_id || '', uom: p.uom, reorder_point: p.reorder_point, initial_stock: '', warehouse_id: '', description: p.description || '' })
    setErrors({})
    setShowModal(true)
  }

  const generateSKU = async () => {
    try {
      const { data } = await api.get('/products/generate-sku/')
      setForm(f => ({ ...f, sku: data.sku }))
    } catch { toast.error('Failed to generate SKU') }
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Product name is required'
    if (!form.sku.trim()) e.sku = 'SKU is required'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = {
        name: form.name, sku: form.sku,
        category_id: form.category_id || null,
        uom: form.uom, reorder_point: Number(form.reorder_point),
        description: form.description || null,
        initial_stock: form.initial_stock ? Number(form.initial_stock) : null,
        warehouse_id: form.warehouse_id || null,
      }
      if (editProduct) {
        await api.put(`/products/${editProduct.id}`, payload)
        toast.success('Product updated')
      } else {
        await api.post('/products/', payload)
        toast.success('Product created')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save product')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/products/${deleteTarget.id}`)
      toast.success('Product archived')
      setDeleteTarget(null)
      load()
    } catch { toast.error('Failed to archive product') }
    finally { setDeleting(false) }
  }

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Products</div>
          <div className="page-subtitle">{loading ? '...' : `${products.length} products`}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={13} /></button>
          <button className="btn btn-primary" onClick={openCreate}><Plus size={15} /> New Product</button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={13} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', pointerEvents: 'none' }} />
          <input placeholder="Search by name or SKU..."
            style={{ paddingLeft: 30, width: 220 }}
            value={search}
            onChange={e => { setSearch(e.target.value); debouncedSearch() }} />
        </div>
        {STATUS_FILTERS.map(s => (
          <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
            onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : s === 'in_stock' ? 'In Stock' : s === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
          </button>
        ))}
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ width: 160 }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {loading ? <SkeletonTable rows={8} cols={7} /> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Product</th><th>SKU</th><th>Category</th>
                <th>UoM</th><th>Total Stock</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 && (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <Package size={36} />
                    <h3>No products found</h3>
                    <p>Add your first product to start tracking inventory</p>
                    <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> Add Product</button>
                  </div>
                </td></tr>
              )}
              {products.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 500, cursor: 'pointer', color: 'var(--accent)' }}
                      onClick={() => navigate(`/products/${p.id}`)}>
                      {p.name}
                    </div>
                  </td>
                  <td><span className="font-mono" style={{ fontSize: 12 }}>{p.sku}</span></td>
                  <td>{p.category_name || <span className="text-muted">—</span>}</td>
                  <td className="text-muted">{p.uom}</td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{formatNumber(p.total_stock)}</span>
                    <span className="text-muted" style={{ fontSize: 11 }}> {p.uom}</span>
                  </td>
                  <td><span className={`badge badge-${p.status}`}>
                    {p.status === 'in_stock' ? 'In Stock' : p.status === 'low_stock' ? 'Low Stock' : 'Out of Stock'}
                  </span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)} title="Edit">
                        <Edit size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                        onClick={() => setDeleteTarget(p)} title="Archive">
                        <Archive size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)}
        title={editProduct ? 'Edit Product' : 'New Product'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editProduct ? 'Update' : 'Create'}
          </button>
        </>}>
        <div className="form-row">
          <div className="form-group">
            <label>Product Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Steel Rod 10mm" />
            {errors.name && <div className="form-error">{errors.name}</div>}
          </div>
          <div className="form-group">
            <label>SKU / Code *</label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={form.sku} onChange={e => set('sku', e.target.value.toUpperCase())} placeholder="e.g. STL-ROD-10" />
              <button type="button" className="btn btn-secondary btn-sm" onClick={generateSKU} title="Auto-generate" style={{ flexShrink: 0 }}>
                <Wand2 size={13} />
              </button>
            </div>
            {errors.sku && <div className="form-error">{errors.sku}</div>}
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Category</label>
            <select value={form.category_id} onChange={e => set('category_id', e.target.value)}>
              <option value="">No Category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Unit of Measure</label>
            <select value={form.uom} onChange={e => set('uom', e.target.value)}>
              {UOMS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Reorder Point</label>
            <input type="number" min={0} value={form.reorder_point}
              onChange={e => set('reorder_point', e.target.value)} placeholder="10" />
          </div>
          {!editProduct && <>
            <div className="form-group">
              <label>Initial Stock (optional)</label>
              <input type="number" min={0} value={form.initial_stock}
                onChange={e => set('initial_stock', e.target.value)} placeholder="0" />
            </div>
          </>}
        </div>
        {!editProduct && form.initial_stock > 0 && (
          <div className="form-group">
            <label>Warehouse for Initial Stock</label>
            <select value={form.warehouse_id} onChange={e => set('warehouse_id', e.target.value)}>
              <option value="">Select warehouse</option>
              {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label>Description</label>
          <textarea rows={2} value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Optional product description..." style={{ resize: 'vertical' }} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Archive Product"
        message={`Archive "${deleteTarget?.name}"? It will no longer appear in product lists.`}
        confirmLabel="Archive"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
