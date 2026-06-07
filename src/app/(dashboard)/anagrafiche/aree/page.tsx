'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import { Plus } from 'lucide-react'

type Area = { id: number; nome: string; descrizione: string | null; attivo: boolean }

export default function AreePage() {
  const [data, setData] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState<Area | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [form, setForm] = useState({ nome: '', descrizione: '' })

  async function fetchData() {
    try {
      setLoading(true)
      const res = await fetch('/api/aree')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/aree', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ nome: '', descrizione: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  function openEdit(a: Area) {
    setSelectedItem(a)
    setForm({ nome: a.nome, descrizione: a.descrizione || '' })
    setEditModalOpen(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedItem) return
    setSaving(true)
    try {
      const res = await fetch(`/api/aree/${selectedItem.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      setEditModalOpen(false)
      setSelectedItem(null)
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Categorie di Lavoro" description="Categorie di lavoro: Agro, Api, Amministrazione, Commerciale, Mista" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuova Categoria</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (<p className="text-gray-500">Caricamento...</p>) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Nome</Th><Th>Descrizione</Th><Th>Stato</Th></Tr>
              </Thead>
              <Tbody>
                {data.map((a) => (
                  <Tr key={a.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openEdit(a)}>
                    <Td className="font-medium">{a.nome}</Td>
                    <Td>{a.descrizione || '-'}</Td>
                    <Td><Badge variant={a.attivo ? 'success' : 'default'}>{a.attivo ? 'Attiva' : 'Disattiva'}</Badge></Td>
                  </Tr>
                ))}
                {data.length === 0 && <Tr><Td colSpan={3} className="text-center text-gray-500 py-8">Nessuna area trovata</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setSelectedItem(null) }} title={`Modifica Categoria - ${selectedItem?.nome}`}>
        {selectedItem && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div><label className="text-sm font-medium block mb-1">Nome</label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div><label className="text-sm font-medium block mb-1">Descrizione</label><Input value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setEditModalOpen(false); setSelectedItem(null) }}>Annulla</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiorna Area'}</Button>
            </div>
          </form>
        )}
      </Modal>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuova Categoria di Lavoro">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-sm font-medium block mb-1">Nome</label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
          <div><label className="text-sm font-medium block mb-1">Descrizione</label><Input value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
