import React from 'react'

interface StatusBadgeProps {
  status: 'PAID' | 'CANCELLED' | 'PENDING' | 'available' | 'occupied' | string
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  let badgeClass = 'badge-warning'
  let displayStatus = status

  if (status === 'PAID') {
    badgeClass = 'badge-success'
  } else if (status === 'CANCELLED') {
    badgeClass = 'badge-danger'
  } else if (status === 'available') {
    badgeClass = 'badge-success'
    displayStatus = 'Free'
  } else if (status === 'occupied') {
    badgeClass = 'badge-danger'
    displayStatus = 'Occupied'
  }

  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {status === 'available' || status === 'occupied' ? '● ' : ''}
      {displayStatus}
    </span>
  )
}
