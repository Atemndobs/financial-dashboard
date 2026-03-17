'use client'

import { useEffect } from 'react'

export function RegisterServiceWorker() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('ServiceWorker registration successful:', registration.scope)
          })
          .catch((error) => {
            console.log('ServiceWorker registration failed:', error)
          })
      })
    }
  }, [])

  return null
}
