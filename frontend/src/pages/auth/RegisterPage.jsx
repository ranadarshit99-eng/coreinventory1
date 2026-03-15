import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Box, Mail, Phone, Lock, User, Eye, EyeOff, Loader, ArrowRight } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import './Auth.css'

const ROLES = [
  { value: 'manager', label: 'Manager', desc: 'Full access' },
  { value: 'sales', label: 'Sales Team', desc: 'Orders & deliveries' },
  { value: 'warehouse', label: 'Warehouse Staff', desc: 'Stock operations' },
  { value: 'viewer', label: 'Viewer', desc: 'Read-only access' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '', password: '', confirm: '', role: 'viewer'
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: '' })) }

  const validate = () => {
    const e = {}
    if (!form.full_name.trim()) e.full_name = 'Name is required'
    if (!form.email && !form.phone) e.email = 'Email or phone required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters'
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const payload = {
        full_name: form.full_name,
        password: form.password,
        role: form.role,
      }
      if (form.email) payload.email = form.email
      if (form.phone) payload.phone = form.phone

      const { data } = await api.post('/auth/register', payload)
      setAuth(data.user, data.access_token)
      toast.success('Account created! Welcome to CoreInventory')
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div className="auth-logo"><Box size={28} /></div>
          <h1>CoreInventory</h1>
          <p>Enterprise Inventory Management System</p>
          <div className="auth-stats">
            <div className="auth-stat"><span>Real-Time</span><small>Stock Updates</small></div>
            <div className="auth-stat"><span>Multi-Warehouse</span><small>Management</small></div>
          </div>
        </div>
      </div>

      <div className="auth-form-area">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon-badge"><User size={20} /></div>
            <h2>Create Account</h2>
            <p>Join your team's inventory workspace</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Full Name</label>
              <div className="input-icon-wrap">
                <User size={15} />
                <input type="text" placeholder="John Smith" value={form.full_name}
                  onChange={e => set('full_name', e.target.value)} required />
              </div>
              {errors.full_name && <div className="form-error">{errors.full_name}</div>}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email Address</label>
                <div className="input-icon-wrap">
                  <Mail size={15} />
                  <input type="email" placeholder="you@company.com" value={form.email}
                    onChange={e => set('email', e.target.value)} />
                </div>
                {errors.email && <div className="form-error">{errors.email}</div>}
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <div className="input-icon-wrap">
                  <Phone size={15} />
                  <input type="tel" placeholder="+1 234 567 8900" value={form.phone}
                    onChange={e => set('phone', e.target.value)} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Role</label>
              <div className="role-select-grid">
                {ROLES.map(r => (
                  <button key={r.value} type="button"
                    className={`role-option ${form.role === r.value ? 'active' : ''}`}
                    onClick={() => set('role', r.value)}>
                    <strong>{r.label}</strong>
                    <small>{r.desc}</small>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Password</label>
                <div className="input-icon-wrap">
                  <Lock size={15} />
                  <input type={showPass ? 'text' : 'password'} placeholder="Min 6 chars"
                    value={form.password} onChange={e => set('password', e.target.value)} required />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {errors.password && <div className="form-error">{errors.password}</div>}
              </div>
              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-icon-wrap">
                  <Lock size={15} />
                  <input type={showPass ? 'text' : 'password'} placeholder="Repeat password"
                    value={form.confirm} onChange={e => set('confirm', e.target.value)} required />
                </div>
                {errors.confirm && <div className="form-error">{errors.confirm}</div>}
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
              {loading ? <Loader size={15} className="spin" /> : null}
              Create Account <ArrowRight size={15} />
            </button>
            <p className="auth-link-text">
              Already have an account? <Link to="/login">Sign In</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
