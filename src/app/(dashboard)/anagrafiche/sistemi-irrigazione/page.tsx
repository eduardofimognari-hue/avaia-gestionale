'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import { Plus, Pencil, Trash2, Droplets } from 'lucide-react'
import { ExportButton } from '@/components/ui/export-button'

type SistemaIrrigazione = { id: number; nome: string }

export default function SistemiIrrigazionePage() {
  const [data, setData] = useState<SistemaIrrigazione[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<SistemaIrrigazione | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [nome, setNome] = useState('')

  async function fetchData() {
    try {
      setLoading(true)
      const res = await fetch('/api/sistemi-irrigazione')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  function openNew() { setNome(''); setEditItem(null); setModalOpen(true) }
  function openEdit(item: SistemaIrrigazione) { setNome(item.nome); setEditItem(item); setModalOpen(true) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (editItem) {
        const res = await fetch(`/api/sistemi-irrigazione/${editItem.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }),
        })
        if (!res.ok) throw new Error()
      } else {
        const res = await fetch('/api/sistemi-irrigazione', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }),
        })
        if (!res.ok) throw new Error()
      }
      setModalOpen(false)
      setEditItem(null)
      setNome('')
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  async function handleDelete(item: SistemaIrrigazione) {
    if (!confirm(`Eliminare il sistema "${item.nome}"? Gli stacchi produttivi associati rimarranno senza sistema di irrigazione.`)) return
    try {
      await fetch(`/api/sistemi-irrigazione/${item.id}`, { method: 'DELETE' })
      await fetchData()
    } catch { setError('Errore durante l\'eliminazione') }
  }

  return (
    <div>
      <PageHeader
        title="Sistemi di Irrigazione"
        description="Gestisci i sistemi irrigui associabili agli stacchi produttivi"
        action={<div className="flex items-center gap-2"><ExportButton risorsa="sistemi-irrigazione" /><Button onClick={openNew}><Plus className="w-4 h-4 mr-2" />Nuovo Sistema</Button></div>}
      />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? <p className="text-gray-500">Caricamento...</p> : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Nome sistema</Th><Th className="w-28">Azioni</Th></Tr>
              </Thead>
              <Tbody>
                {data.map((item) => (
                  <Tr key={item.id}>
                    <Td className="font-medium flex items-center gap-2">
                      <Droplets className="w-4 h-4 text-blue-500 shrink-0" />
                      {item.nome}
                    </Td>
                    <Td>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ))}
                {data.length === 0 && (
                  <Tr><Td colSpan={2} className="text-center text-gray-500 py-8">
                    Nessun sistema di irrigazione. Aggiungine uno per poterlo assegnare agli stacchi produttivi.
                  </Td></Tr>
                )}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditItem(null); setNome('') }}
        title={editItem ? `Modifica — ${editItem.nome}` : 'Nuovo Sistema di Irrigazione'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1">Nome sistema *</label>
            <Input
              value={nome}
              onChange={e => setNome(e.target.value)}
              placeholder="Es. Goccia, Aspersione, Microjet, Scorrimento…"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); setEditItem(null); setNome('') }}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : editItem ? 'Aggiorna' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
