import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Box, Mail, Phone, Lock, ArrowRight, Loader, Eye, EyeOff, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import { useAuthStore } from '../../store/authStore'
import './Auth.css'

const STEPS = { IDENTIFIER: 'identifier', METHOD: 'method', OTP: 'otp', PASSWORD: 'password' }

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [step, setStep] = useState(STEPS.IDENTIFIER)
  const [identifier, setIdentifier] = useState('')
  const [method, setMethod] = useState('otp') // 'otp' | 'password'
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const isEmail = identifier.includes('@')
  const isPhone = /^\+?[\d\s\-]{7,}$/.test(identifier) && !identifier.includes('@')

  const startCountdown = () => {
    setCountdown(60)
    const t = setInterval(() => {
      setCountdown(v => { if (v <= 1) { clearInterval(t); return 0 } return v - 1 })
    }, 1000)
  }

  const handleIdentifierSubmit = async (e) => {
    e.preventDefault()
    if (!identifier.trim()) return
    setStep(STEPS.METHOD)
  }

  const handleSendOTP = async () => {
    setLoading(true)
    try {
      await api.post('/auth/send-otp', { identifier: identifier.trim(), purpose: 'login' })
      setOtpSent(true)
      setStep(STEPS.OTP)
      startCountdown()
      toast.success(`OTP sent to ${identifier.includes('@') ? 'your email' : 'your phone'}`)
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleOTPChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]
    next[idx] = val
    setOtp(next)
    if (val && idx < 5) {
      document.getElementById(`otp-${idx + 1}`)?.focus()
    }
  }

  const handleOTPKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus()
    }
  }

  const handleOTPPaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = [...otp]
    pasted.split('').forEach((c, i) => { next[i] = c })
    setOtp(next)
    document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus()
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter the 6-digit OTP'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-otp', {
        identifier: identifier.trim(), otp: code, purpose: 'login'
      })
      setAuth(data.user, data.access_token)
      toast.success(`Welcome back, ${data.user.full_name}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    if (!password) return
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', {
        identifier: identifier.trim(), password
      })
      setAuth(data.user, data.access_token)
      toast.success(`Welcome back, ${data.user.full_name}!`)
      navigate('/')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials')
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
            <div className="auth-stat"><span>SAP-Grade</span><small>Architecture</small></div>
            <div className="auth-stat"><span>Real-Time</span><small>Stock Tracking</small></div>
            <div className="auth-stat"><span>Multi-Role</span><small>Access Control</small></div>
          </div>
        </div>
      </div>

      <div className="auth-form-area">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon-badge"><Box size={20} /></div>
            <h2>Sign In</h2>
            <p>Access your inventory workspace</p>
          </div>

          {/* Step: Enter identifier */}
          {step === STEPS.IDENTIFIER && (
            <form onSubmit={handleIdentifierSubmit} className="auth-form">
              <div className="form-group">
                <label>Email Address or Phone Number</label>
                <div className="input-icon-wrap">
                  {isPhone ? <Phone size={15} /> : <Mail size={15} />}
                  <input
                    type="text"
                    placeholder="email@company.com or +1234567890"
                    value={identifier}
                    onChange={e => setIdentifier(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={!identifier.trim()}>
                Continue <ArrowRight size={15} />
              </button>
              <p className="auth-link-text">
                Don't have an account? <Link to="/register">Register</Link>
              </p>
            </form>
          )}

          {/* Step: Choose login method */}
          {step === STEPS.METHOD && (
            <div className="auth-form">
              <div className="method-identifier">
                <span>{isEmail ? <Mail size={13}/> : <Phone size={13}/>}</span>
                <span>{identifier}</span>
                <button onClick={() => setStep(STEPS.IDENTIFIER)} className="change-btn">Change</button>
              </div>
              <p className="method-label">How would you like to sign in?</p>
              <div className="method-cards">
                <button
                  className={`method-card ${method === 'otp' ? 'active' : ''}`}
                  onClick={() => setMethod('otp')}
                >
                  <div className="method-card-icon">🔐</div>
                  <div>
                    <strong>OTP Login</strong>
                    <small>One-time password via {isEmail ? 'email' : 'SMS'}</small>
                  </div>
                </button>
                <button
                  className={`method-card ${method === 'password' ? 'active' : ''}`}
                  onClick={() => setMethod('password')}
                >
                  <div className="method-card-icon">🔑</div>
                  <div>
                    <strong>Password Login</strong>
                    <small>Use your account password</small>
                  </div>
                </button>
              </div>
              <button
                className="btn btn-primary btn-lg w-full"
                onClick={method === 'otp' ? handleSendOTP : () => setStep(STEPS.PASSWORD)}
                disabled={loading}
              >
                {loading ? <Loader size={15} className="spin" /> : null}
                {method === 'otp' ? `Send OTP to ${isEmail ? 'Email' : 'Phone'}` : 'Enter Password'}
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {/* Step: OTP entry */}
          {step === STEPS.OTP && (
            <form onSubmit={handleVerifyOTP} className="auth-form">
              <div className="method-identifier">
                <span>{isEmail ? <Mail size={13}/> : <Phone size={13}/>}</span>
                <span>{identifier}</span>
              </div>
              <p className="otp-hint">Enter the 6-digit OTP sent to your {isEmail ? 'email' : 'phone'}</p>
              <div className="otp-inputs" onPaste={handleOTPPaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOTPChange(idx, e.target.value)}
                    onKeyDown={e => handleOTPKeyDown(idx, e)}
                    className="otp-cell"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading || otp.join('').length < 6}>
                {loading ? <Loader size={15} className="spin" /> : 'Verify OTP'}
              </button>
              <div className="otp-resend">
                {countdown > 0
                  ? <span className="text-muted">Resend OTP in {countdown}s</span>
                  : <button type="button" className="resend-btn" onClick={handleSendOTP} disabled={loading}>
                      <RefreshCw size={13} /> Resend OTP
                    </button>
                }
              </div>
              <p className="auth-link-text"><Link to="/forgot-password">Forgot password?</Link></p>
            </form>
          )}

          {/* Step: Password entry */}
          {step === STEPS.PASSWORD && (
            <form onSubmit={handlePasswordLogin} className="auth-form">
              <div className="method-identifier">
                <span>{isEmail ? <Mail size={13}/> : <Phone size={13}/>}</span>
                <span>{identifier}</span>
                <button type="button" onClick={() => setStep(STEPS.METHOD)} className="change-btn">Back</button>
              </div>
              <div className="form-group">
                <label>Password</label>
                <div className="input-icon-wrap">
                  <Lock size={15} />
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                    required
                  />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading || !password}>
                {loading ? <Loader size={15} className="spin" /> : 'Sign In'}
              </button>
              <p className="auth-link-text"><Link to="/forgot-password">Forgot password?</Link></p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
