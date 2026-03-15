import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Box, Mail, Phone, Lock, ArrowRight, Loader, Eye, EyeOff, RefreshCw, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'
import './Auth.css'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1) // 1=email, 2=otp, 3=newpass, 4=done
  const [identifier, setIdentifier] = useState('')
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  const startCountdown = () => {
    setCountdown(60)
    const t = setInterval(() => setCountdown(v => {
      if (v <= 1) { clearInterval(t); return 0 } return v - 1
    }), 1000)
  }

  const handleSendOTP = async (e) => {
    e?.preventDefault()
    if (!identifier.trim()) return
    setLoading(true)
    try {
      await api.post('/auth/send-otp', { identifier: identifier.trim(), purpose: 'reset' })
      setStep(2)
      startCountdown()
      toast.success('OTP sent!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No account found')
    } finally { setLoading(false) }
  }

  const handleOTPChange = (idx, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...otp]; next[idx] = val; setOtp(next)
    if (val && idx < 5) document.getElementById(`rotp-${idx + 1}`)?.focus()
  }
  const handleOTPKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) document.getElementById(`rotp-${idx - 1}`)?.focus()
  }
  const handleOTPPaste = (e) => {
    e.preventDefault()
    const p = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const next = [...otp]; p.split('').forEach((c, i) => { next[i] = c }); setOtp(next)
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    const code = otp.join('')
    if (code.length < 6) { toast.error('Enter full OTP'); return }
    // Just move to step 3, will verify+reset in final step
    setStep(3)
  }

  const handleReset = async (e) => {
    e.preventDefault()
    if (newPass.length < 6) { toast.error('Password too short'); return }
    if (newPass !== confirmPass) { toast.error('Passwords do not match'); return }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', {
        identifier: identifier.trim(), otp: otp.join(''), new_password: newPass
      })
      setStep(4)
      toast.success('Password reset successfully!')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid OTP or expired')
      setStep(2)
    } finally { setLoading(false) }
  }

  const steps = ['Identify', 'Verify OTP', 'New Password']

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="auth-brand-inner">
          <div className="auth-logo"><Box size={28} /></div>
          <h1>CoreInventory</h1>
          <p>Enterprise Inventory Management System</p>
        </div>
      </div>
      <div className="auth-form-area">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-icon-badge"><Lock size={20} /></div>
            <h2>Reset Password</h2>
            <p>Recover access to your account</p>
          </div>

          {step < 4 && (
            <div className="auth-steps">
              {steps.map((s, i) => (
                <div key={i} className={`auth-step ${step === i + 1 ? 'active' : step > i + 1 ? 'done' : ''}`} />
              ))}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleSendOTP} className="auth-form">
              <div className="form-group">
                <label>Email or Phone Number</label>
                <div className="input-icon-wrap">
                  <Mail size={15} />
                  <input type="text" placeholder="Registered email or phone"
                    value={identifier} onChange={e => setIdentifier(e.target.value)}
                    autoFocus required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <Loader size={15} className="spin" /> : null}
                Send Reset OTP <ArrowRight size={15} />
              </button>
              <p className="auth-link-text"><Link to="/login">← Back to Login</Link></p>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="auth-form">
              <div className="method-identifier">
                <Mail size={13} /><span>{identifier}</span>
              </div>
              <p className="otp-hint">Enter the 6-digit OTP sent to your account</p>
              <div className="otp-inputs" onPaste={handleOTPPaste}>
                {otp.map((d, idx) => (
                  <input key={idx} id={`rotp-${idx}`} type="text" inputMode="numeric"
                    maxLength={1} value={d}
                    onChange={e => handleOTPChange(idx, e.target.value)}
                    onKeyDown={e => handleOTPKeyDown(idx, e)}
                    className="otp-cell" autoFocus={idx === 0} />
                ))}
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full"
                disabled={otp.join('').length < 6}>
                Verify OTP
              </button>
              <div className="otp-resend">
                {countdown > 0
                  ? <span className="text-muted">Resend in {countdown}s</span>
                  : <button type="button" className="resend-btn" onClick={handleSendOTP}>
                      <RefreshCw size={13} /> Resend OTP
                    </button>
                }
              </div>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handleReset} className="auth-form">
              <div className="form-group">
                <label>New Password</label>
                <div className="input-icon-wrap">
                  <Lock size={15} />
                  <input type={showPass ? 'text' : 'password'} placeholder="Min 6 characters"
                    value={newPass} onChange={e => setNewPass(e.target.value)} autoFocus required />
                  <button type="button" className="pass-toggle" onClick={() => setShowPass(v => !v)}>
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Confirm New Password</label>
                <div className="input-icon-wrap">
                  <Lock size={15} />
                  <input type={showPass ? 'text' : 'password'} placeholder="Repeat new password"
                    value={confirmPass} onChange={e => setConfirmPass(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-lg w-full" disabled={loading}>
                {loading ? <Loader size={15} className="spin" /> : 'Reset Password'}
              </button>
            </form>
          )}

          {step === 4 && (
            <div className="auth-form" style={{ alignItems: 'center', textAlign: 'center' }}>
              <CheckCircle size={48} style={{ color: 'var(--success)' }} />
              <h3 style={{ fontSize: '17px', fontWeight: 700 }}>Password Reset!</h3>
              <p className="text-muted">Your password has been updated successfully.</p>
              <button className="btn btn-primary btn-lg w-full" onClick={() => navigate('/login')}>
                Sign In Now <ArrowRight size={15} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
