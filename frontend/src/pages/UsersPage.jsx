import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Edit, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { formatDate, getInitials, roleLabel } from '../utils/helpers'
import { Modal } from '../components/ui/Modal'
import SkeletonTable from '../components/ui/SkeletonTable'

const ROLES = ['admin', 'manager', 'sales', 'warehouse', 'viewer']
const ROLE_DESCS = {
  admin: 'Full system access', manager: 'Manage all operations',
  sales: 'Orders & deliveries', warehouse: 'Stock operations', viewer: 'Read-only access'
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', role: 'viewer'
  })
  const [errors, setErrors] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users/')
      setUsers(data)
    } catch { toast.error('Failed to load users') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditUser(null)
    setForm({ full_name: '', email: '', phone: '', password: '', role: 'viewer' })
    setErrors({})
    setShowModal(true)
  }

  const openEdit = (u) => {
    setEditUser(u)
    setForm({ full_name: u.full_name, email: u.email || '', phone: u.phone || '', password: '', role: u.role })
    setErrors({})
    setShowModal(true)
  }

  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Name required'
    if (!form.email && !form.phone) e.email = 'Email or phone required'
    if (!editUser && form.password.length < 6) e.password = 'Password min 6 chars'
    return e
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      if (editUser) {
        await api.put(`/users/${editUser.id}`, {
          full_name: form.full_name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          role: form.role,
        })
        toast.success('User updated')
      } else {
        await api.post('/users/', {
          full_name: form.full_name,
          email: form.email || undefined,
          phone: form.phone || undefined,
          password: form.password,
          role: form.role,
        })
        toast.success('User created')
      }
      setShowModal(false)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save user')
    } finally { setSaving(false) }
  }

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Users</div>
          <div className="page-subtitle">Manage team members and access roles</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={15} /> New User
        </button>
      </div>

      {loading ? <SkeletonTable rows={5} cols={5} /> : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>User</th><th>Contact</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 && (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <Users size={36} />
                    <h3>No users found</h3>
                  </div>
                </td></tr>
              )}
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: u.avatar_color || '#0070F2',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 700, color: '#fff', flexShrink: 0
                      }}>{getInitials(u.full_name)}</div>
                      <span style={{ fontWeight: 500 }}>{u.full_name}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12 }}>
                      {u.email && <div className="text-muted">{u.email}</div>}
                      {u.phone && <div className="text-muted">{u.phone}</div>}
                    </div>
                  </td>
                  <td><span className={`badge badge-${u.role}`}>{roleLabel(u.role)}</span></td>
                  <td>
                    <span style={{
                      background: u.is_active ? 'var(--success-bg)' : 'var(--danger-bg)',
                      color: u.is_active ? 'var(--success)' : 'var(--danger)',
                      padding: '3px 8px', borderRadius: 99, fontSize: 11, fontWeight: 600
                    }}>
                      {u.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: 12 }}>{formatDate(u.created_at)}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>
                      <Edit size={13} />
                    </button>
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
        title={editUser ? 'Edit User' : 'New User'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : editUser ? 'Update' : 'Create User'}
          </button>
        </>}
      >
        <div className="form-group">
          <label>Full Name *</label>
          <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Full name" autoFocus />
          {errors.full_name && <div className="form-error">{errors.full_name}</div>}
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="user@company.com" />
            {errors.email && <div className="form-error">{errors.email}</div>}
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+1 234 567 8900" />
          </div>
        </div>
        {!editUser && (
          <div className="form-group">
            <label>Initial Password *</label>
            <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 6 characters" />
            {errors.password && <div className="form-error">{errors.password}</div>}
          </div>
        )}
        <div className="form-group">
          <label>Role</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {ROLES.map(r => (
              <button key={r} type="button"
                onClick={() => set('role', r)}
                style={{
                  padding: '8px 10px', borderRadius: 'var(--radius)',
                  border: `2px solid ${form.role === r ? 'var(--accent)' : 'var(--border)'}`,
                  background: form.role === r ? 'var(--accent-light)' : 'var(--bg-card)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 150ms'
                }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: form.role === r ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {roleLabel(r)}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{ROLE_DESCS[r]}</div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}
