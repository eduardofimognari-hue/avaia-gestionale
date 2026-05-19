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

type Prodotto = {
  id: number
  codice: string
  nome: string
  varietaTipologia: string | null
  categoria: string | null
  unitaMisura: string
  attivo: boolean
  note: string | null
}

export default function ProdottiPage() {
  const [data, setData] = useState<Prodotto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ codice: '', nome: '', varietaTipologia: '', categoria: '', unitaMisura: 'kg', note: '' })

  async function fetchData() {
    try {
      setLoading(true)
      const res = await fetch('/api/prodotti')
      if (!res.ok) throw new Error('Errore caricamento prodotti')
      setData(await res.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const { codice, ...data } = form
      const res = await fetch('/api/prodotti', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      if (!res.ok) throw new Error('Erroore salvataggio')
      setModalOpen(false)
      setForm({ codice: '', nome: '', varietaTipologia: '', categoria: '', unitaMisura: 'kg', note: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Prodotti" description="Gestione prodotti e varietà" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Prodotto</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Codice</Th><Th>Nome</Th><Th>Varietà</Th><Th>Categoria</Th><Th>Unità Misura</Th><Th>Stato</Th></Tr>
              </Thead>
              <Tbody>
                {data.map((p) => (
                  <Tr key={p.id}>
                    <Td className="font-medium">{p.codice}</Td>
                    <Td>{p.nome}</Td>
                    <Td>{p.varietaTipologia || '-'}</Td>
                    <Td>{p.categoria || '-'}</Td>
                    <Td>{p.unitaMisura}</Td>
                    <Td><Badge variant={p.attivo ? 'success' : 'default'}>{p.attivo ? 'Attivo' : 'Disattivo'}</Badge></Td>
                  </Tr>
                ))}
                {data.length === 0 && <Tr><Td colSpan={6} className="text-center text-gray-500 py-8">Nessun prodotto trovato</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Prodotto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="text-sm font-medium block mb-1">Codice</label><Input value="Auto-generato" disabled className="text-gray-400" /></div>
          <div><label className="text-sm font-medium block mb-1">Nome</label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
          <div><label className="text-sm font-medium block mb-1">Varietà / Tipologia</label><Input value={form.varietaTipologia} onChange={(e) => setForm({ ...form, varietaTipologia: e.target.value })} /></div>
          <div><label className="text-sm font-medium block mb-1">Categoria</label><Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} /></div>
          <div><label className="text-sm font-medium block mb-1">Unità di Misura</label>
            <Select value={form.unitaMisura} onChange={(e) => setForm({ ...form, unitaMisura: e.target.value })}>
              <option value="kg">kg</option>
              <option value="g">g</option>
              <option value="pezzi">pezzi</option>
              <option value="litri">litri</option>
            </Select>
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
