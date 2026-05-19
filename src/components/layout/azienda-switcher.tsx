'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Check, ChevronDown } from 'lucide-react'

interface Azienda {
  id: number
  nome: string
  slug: string
}

export function AziendaSwitcher() {
  const router = useRouter()
  const [aziende, setAziende] = useState<Azienda[]>([])
  const [current, setCurrent] = useState<Azienda | null>(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetch('/api/aziende')
      .then(r => r.json())
      .then(async (data) => {
        setAziende(data.aziende)
        setCurrent(data.current)
        if (data.current) {
          await fetch('/api/aziende/set', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ aziendaId: data.current.id }),
          })
        }
      })
      .catch(() => {})
  }, [])

  async function handleSelect(a: Azienda) {
    setOpen(false)
    await fetch('/api/aziende/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aziendaId: a.id }),
    })
    setCurrent(a)
    router.refresh()
  }

  if (!current) return null

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <Building2 className="w-4 h-4 text-gray-400" />
        <span className="truncate">{current.nome}</span>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20">
            {aziende.map(a => (
              <button
                key={a.id}
                onClick={() => handleSelect(a)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
              >
                <span className="flex-1 truncate">{a.nome}</span>
                {current.id === a.id && <Check className="w-4 h-4 text-primary-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
