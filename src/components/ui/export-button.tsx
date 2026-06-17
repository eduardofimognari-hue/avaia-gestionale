'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown } from 'lucide-react'

interface ExportButtonProps {
  risorsa: string
  from?: string
  to?: string
}

export function ExportButton({ risorsa, from, to }: ExportButtonProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function buildUrl(format: 'csv' | 'json') {
    const params = new URLSearchParams({ format })
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    return `/api/export/${risorsa}?${params}`
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1"
      >
        <Download className="w-4 h-4" />
        Esporta
        <ChevronDown className="w-3.5 h-3.5 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-36 bg-white border border-gray-200 rounded-md shadow-lg">
          <a
            href={buildUrl('csv')}
            download
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-t-md"
          >
            <span className="font-medium">CSV</span>
            <span className="text-gray-400 text-xs ml-auto">Excel</span>
          </a>
          <a
            href={buildUrl('json')}
            download
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-b-md border-t border-gray-100"
          >
            <span className="font-medium">JSON</span>
            <span className="text-gray-400 text-xs ml-auto">Raw</span>
          </a>
        </div>
      )}
    </div>
  )
}
