'use client'

import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import { Plus } from 'lucide-react'
import { ExportButton } from '@/components/ui/export-button'

type Cliente = {
  id: number
  nome: string
  cognome: string | null
  ragioneSociale: string | null
  tipo: string
  codiceFiscale: string | null
  partitaIva: string | null
  telefono: string | null
  email: string | null
  indirizzo: string | null
  comune: string | null
  provincia: string | null
  cap: string | null
  note: string | null
  attivo: boolean
}

export default function ClientiPage() {
  const [data, setData] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState<Cliente | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [form, setForm] = useState({
    nome: '', cognome: '', tipo: 'Privato', codiceFiscale: '', partitaIva: '',
    telefono: '', email: '', indirizzo: '', comune: '', provincia: '', cap: '', note: ''
  })

  async function fetchData() {
    try {
      setLoading(true)
      const res = await fetch('/api/clienti')
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
      const res = await fetch('/api/clienti', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ nome: '', cognome: '', tipo: 'Privato', codiceFiscale: '', partitaIva: '', telefono: '', email: '', indirizzo: '', comune: '', provincia: '', cap: '', note: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  function openEdit(c: Cliente) {
    setSelectedItem(c)
    setForm({ nome: c.nome, cognome: c.cognome || '', tipo: c.tipo, codiceFiscale: c.codiceFiscale || '', partitaIva: c.partitaIva || '', telefono: c.telefono || '', email: c.email || '', indirizzo: c.indirizzo || '', comune: c.comune || '', provincia: c.provincia || '', cap: c.cap || '', note: c.note || '' })
    setEditModalOpen(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedItem) return
    setSaving(true)
    try {
      const res = await fetch(`/api/clienti/${selectedItem.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      setEditModalOpen(false)
      setSelectedItem(null)
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Clienti" description="Anagrafica clienti" action={<div className="flex items-center gap-2"><ExportButton risorsa="clienti" /><Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Cliente</Button></div>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Nome</Th><Th>Cognome</Th><Th>Tipo</Th><Th>Telefono</Th><Th>Email</Th><Th>Stato</Th></Tr>
              </Thead>
              <Tbody>
                  {data.map((c) => (
                  <Tr key={c.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openEdit(c)}>
                    <Td className="font-medium">{c.nome}</Td>
                    <Td>{c.cognome || '-'}</Td>
                    <Td><Badge variant="info">{c.tipo}</Badge></Td>
                    <Td>{c.telefono || '-'}</Td>
                    <Td>{c.email || '-'}</Td>
                    <Td><Badge variant={c.attivo ? 'success' : 'default'}>{c.attivo ? 'Attivo' : 'Disattivo'}</Badge></Td>
                  </Tr>
                ))}
                {data.length === 0 && <Tr><Td colSpan={6} className="text-center text-gray-500 py-8">Nessun cliente trovato</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setSelectedItem(null) }} title={`Modifica Cliente - ${selectedItem?.nome}`}>
        {selectedItem && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium block mb-1">Nome</label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div><label className="text-sm font-medium block mb-1">Cognome</label><Input value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium block mb-1">Tipo</label>
              <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="Privato">Privato</option>
                <option value="Ingrosso">Ingrosso</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium block mb-1">Codice Fiscale</label><Input value={form.codiceFiscale} onChange={(e) => setForm({ ...form, codiceFiscale: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Partita IVA</label><Input value={form.partitaIva} onChange={(e) => setForm({ ...form, partitaIva: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium block mb-1">Telefono</label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium block mb-1">Indirizzo</label><Input value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-sm font-medium block mb-1">Comune</label><Input value={form.comune} onChange={(e) => setForm({ ...form, comune: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Provincia</label><Input value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">CAP</label><Input value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium block mb-1">Note</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setEditModalOpen(false); setSelectedItem(null) }}>Annulla</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiorna Cliente'}</Button>
            </div>
          </form>
        )}
      </Modal>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Cliente">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Nome</label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div><label className="text-sm font-medium block mb-1">Cognome</label><Input value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} /></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Tipo</label>
              <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="Privato">Privato</option>
                <option value="Ingrosso">Ingrosso</option>
              </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Codice Fiscale</label><Input value={form.codiceFiscale} onChange={(e) => setForm({ ...form, codiceFiscale: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Partita IVA</label><Input value={form.partitaIva} onChange={(e) => setForm({ ...form, partitaIva: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Telefono</label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Indirizzo</label><Input value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-sm font-medium block mb-1">Comune</label><Input value={form.comune} onChange={(e) => setForm({ ...form, comune: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Provincia</label><Input value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">CAP</label><Input value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value })} /></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Note</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
