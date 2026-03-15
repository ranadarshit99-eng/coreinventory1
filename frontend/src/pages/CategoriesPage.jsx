import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit, Trash2, Tag } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { Modal } from '../components/ui/Modal'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import SkeletonTable from '../components/ui/SkeletonTable'

export default function CategoriesPage() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState({ name: '', description: '' })
  const [errors, setErrors] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/categories/')
      setCategories(data)
    } catch { toast.error('Failed to load categories') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditItem(null)
    setForm({ name: '', description: '' })
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (c) => {
    setEditItem(c)
    setForm({ name: c.name, description: c.description || '' })
    setErrors({})
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) { setErrors({ name: 'Name is required' }); return }
    setSaving(true)
    try {
      if (editItem) {
        await api.put(`/categories/${editItem.id}`, form)
        toast.success('Category updated')
      } else {
        await api.post('/categories/', form)
        toast.success('Category created')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Save failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/categories/${deleteTarget.id}`)
      toast.success('Category deleted')
      setDeleteTarget(null)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Delete failed')
    } finally { setDeleting(false) }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Categories</div>
          <div className="page-subtitle">Organize products into groups</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> New Category
        </button>
      </div>

      {loading ? <SkeletonTable rows={5} cols={4} /> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Category Name</th>
                <th>Description</th>
                <th>Products</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 && (
                <tr><td colSpan={4}>
                  <div className="empty-state">
                    <Tag size={36} />
                    <h3>No categories yet</h3>
                    <p>Create categories to organize your products</p>
                    <button className="btn btn-primary" onClick={openCreate}>
                      <Plus size={14} /> New Category
                    </button>
                  </div>
                </td></tr>
              )}
              {categories.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="text-muted">{c.description || '—'}</td>
                  <td>
                    <span style={{
                      background: 'var(--accent-light)', color: 'var(--accent)',
                      padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 600
                    }}>
                      {c.product_count} product{c.product_count !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(c)}>
                        <Edit size={13} />
                      </button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}
                        onClick={() => setDeleteTarget(c)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editItem ? 'Edit Category' : 'New Category'}
        size="sm"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editItem ? 'Update' : 'Create'}
          </button>
        </>}
      >
        <div className="form-group">
          <label>Category Name *</label>
          <input
            value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors({}) }}
            placeholder="e.g. Raw Materials"
            autoFocus
          />
          {errors.name && <div className="form-error">{errors.name}</div>}
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            placeholder="Optional description..."
            style={{ resize: 'vertical' }}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? Products in this category will become uncategorized.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
