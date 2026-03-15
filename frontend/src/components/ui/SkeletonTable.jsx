import React, { useState } from 'react'
import { AlertTriangle, Bell, CheckCircle, Package, ClipboardList } from 'lucide-react'

export default function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>{Array(cols).fill(0).map((_, i) => (
            <th key={i}><div className="skeleton" style={{ height: 10, width: `${60 + i * 10}px` }} /></th>
          ))}</tr>
        </thead>
        <tbody>
          {Array(rows).fill(0).map((_, r) => (
            <tr key={r}>{Array(cols).fill(0).map((_, c) => (
              <td key={c}><div className="skeleton" style={{ height: 12, width: `${50 + c * 15}px` }} /></td>
            ))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
