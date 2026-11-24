import React from 'react'

export default function StaffPageSkeleton({ compact = false }) {
  return (
    <section className={`staff-page-skeleton ${compact ? 'is-compact' : ''}`} aria-label="Loading page" aria-busy="true">
      <div className="skeleton-shimmer skeleton-heading" />
      <div className="skeleton-shimmer skeleton-subheading" />
      <div className="skeleton-kpis">
        {[1,2,3,4].map((item) => <div className="skeleton-shimmer skeleton-kpi" key={item} />)}
      </div>
      <div className="skeleton-shimmer skeleton-panel" />
      <div className="skeleton-shimmer skeleton-row" />
      <div className="skeleton-shimmer skeleton-row" />
    </section>
  )
}
