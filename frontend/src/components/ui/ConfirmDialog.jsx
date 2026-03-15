import React from 'react'
import { AlertTriangle, Loader } from 'lucide-react'

export default function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger = false, loading, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div className="modal modal-sm">
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {danger && <AlertTriangle size={16} style={{ color: 'var(--danger)' }} />}
            {title}
          </h2>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? <Loader size={14} className="spin" /> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
