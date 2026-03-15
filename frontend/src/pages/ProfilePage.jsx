import React, { useState } from 'react'
import { User, Lock, Save, Loader, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../utils/api'
import { useAuthStore } from '../store/authStore'
import { getInitials, roleLabel } from '../utils/helpers'

const AVATAR_COLORS = ['#0070F2', '#7C3AED', '#059669', '#D97706', '#DC2626', '#0EA5E9', '#DB2777', '#0891B2']

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    avatar_color: user?.avatar_color || '#0070F2',
  })
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    if (!form.full_name.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const { data } = await api.put(`/users/${user.id}`, {
        full_name: form.full_name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        avatar_color: form.avatar_color,
      })
      updateUser({ full_name: data.full_name, email: data.email, phone: data.phone, avatar_color: data.avatar_color })
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update profile')
    } finally { setSaving(false) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (pwForm.new_password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    if (pwForm.new_password !== pwForm.confirm) { toast.error('Passwords do not match'); return }
    setSavingPw(true)
    try {
      await api.post('/auth/change-password', {
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      })
      toast.success('Password changed successfully')
      setPwForm({ current_password: '', new_password: '', confirm: '' })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password')
    } finally { setSavingPw(false) }
  }

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <div className="page-title">My Profile</div>
          <div className="page-subtitle">Manage your account details</div>
        </div>
      </div>

      {/* Avatar + role banner */}
      <div className="card" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: form.avatar_color, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 24, fontWeight: 800, color: '#fff', flexShrink: 0
        }}>
          {getInitials(form.full_name)}
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{user?.full_name}</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`badge badge-${user?.role}`}>{roleLabel(user?.role)}</span>
            {user?.email && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.email}</span>}
            {user?.phone && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.phone}</span>}
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8, letterSpacing: '0.5px' }}>
            Avatar Color
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 200 }}>
            {AVATAR_COLORS.map(c => (
              <button key={c} type="button"
                onClick={() => setForm(f => ({ ...f, avatar_color: c }))}
                style={{
                  width: 24, height: 24, borderRadius: '50%', background: c, border: 'none',
                  cursor: 'pointer', outline: form.avatar_color === c ? `3px solid ${c}` : 'none',
                  outlineOffset: 2, transition: 'transform 150ms',
                  transform: form.avatar_color === c ? 'scale(1.2)' : 'scale(1)'
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <User size={15} /> Personal Information
        </h3>
        <form onSubmit={handleSaveProfile}>
          <div className="form-group">
            <label>Full Name *</label>
            <input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Your full name" />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@company.com" />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 234 567 8900" />
            </div>
          </div>
          <div className="form-group">
            <label>Role</label>
            <input value={roleLabel(user?.role)} disabled style={{ background: 'var(--bg)', color: 'var(--text-muted)' }} />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Role can only be changed by an admin</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <Loader size={14} className="spin" /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="card">
        <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={15} /> Change Password
        </h3>
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPw ? 'text' : 'password'}
                value={pwForm.current_password}
                onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                placeholder="Your current password"
                required
              />
              <button type="button" className="pass-toggle" onClick={() => setShowPw(v => !v)}
                style={{ position: 'absolute', right: 12 }}>
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>New Password</label>
              <input type={showPw ? 'text' : 'password'} value={pwForm.new_password}
                onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                placeholder="Min 6 characters" required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type={showPw ? 'text' : 'password'} value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                placeholder="Repeat new password" required />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={savingPw}>
              {savingPw ? <Loader size={14} className="spin" /> : <Lock size={14} />}
              {savingPw ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
