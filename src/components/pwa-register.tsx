'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', async () => {
        try {
          const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
          reg.addEventListener('updatefound', () => {
            const installing = reg.installing
            if (installing) {
              installing.addEventListener('statechange', () => {
                if (installing.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[PWA] Nuova versione disponibile. Ricarica la pagina per aggiornare.')
                }
              })
            }
          })
          console.log('[PWA] Service Worker registrato')
        } catch (err) {
          console.warn('[PWA] Registrazione SW fallita:', err)
        }
      })
    }
  }, [])

  return null
}
