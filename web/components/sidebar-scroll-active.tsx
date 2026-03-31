'use client'

import { useEffect } from 'react'

export function SidebarScrollToActive() {
  useEffect(() => {
    const el = document.querySelector('[data-sidebar-active]')
    el?.scrollIntoView({ block: 'center', behavior: 'instant' })
  }, [])
  return null
}
