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

type Luogo = {
  id: number
  nome: string
  tipo: string
  indirizzo: string | null
  comune: string | null
  provincia: string | null
  cap: string | null
  attivo: boolean
}

export default function LuoghiPage() {
  const [data, setData] = useState<Luogo[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ nome: '', tipo: 'fisico', indirizzo: '', comune: '', provincia: '', cap: '', note: '' })

  async function fetchData() {
    try {
      setLoading(true)
      const res = await fetch('/api/luoghi')
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
      const res = await fetch('/api/luoghi', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ nome: '', tipo: 'fisico', indirizzo: '', comune: '', provincia: '', cap: '', note: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  const tipoBadge = (t: string) => {
    switch (t) {
      case 'fisico': return 'default'
      case 'virtuale': return 'warning'
      case 'settore': return 'info'
      default: return 'default'
    }
  }

  return (
    <div>
      <PageHeader title="Luoghi" description="Luoghi, sedi e centri di costo" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Luogo</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Nome</Th><Th>Tipo</Th><Th>Indirizzo</Th><Th>Comune</Th><Th>Provincia</Th><Th>Stato</Th></Tr>
              </Thead>
              <Tbody>
                {data.map((l) => (
                  <Tr key={l.id}>
                    <Td className="font-medium">{l.nome}</Td>
                    <Td><Badge variant={tipoBadge(l.tipo) as any}>{l.tipo}</Badge></Td>
                    <Td>{l.indirizzo || '-'}</Td>
                    <Td>{l.comune || '-'}</Td>
                    <Td>{l.provincia || '-'}</Td>
                    <Td><Badge variant={l.attivo ? 'success' : 'default'}>{l.attivo ? 'Attivo' : 'Disattivo'}</Badge></Td>
                  </Tr>
                ))}
                {data.length === 0 && <Tr><Td colSpan={6} className="text-center text-gray-500 py-8">Nessun luogo trovato</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Luogo">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Nome</label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div><label className="text-sm font-medium block mb-1">Tipo</label>
              <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="fisico">Fisico</option>
                <option value="virtuale">Virtuale (centro di costo)</option>
              </Select>
            </div>
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
