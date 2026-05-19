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
import { formatEuro, formatDate } from '@/lib/utils'

type Listino = {
  id: number
  anno: number
  prodotto: { nome: string; varietaTipologia: string | null }
  tipoCliente: string
  formato: string
  unitaMisura: string
  prezzoBase: number
  dataInizio: string | null
  dataFine: string | null
  attivo: boolean
}

type Prodotto = { id: number; nome: string }

export default function ListinoPage() {
  const [data, setData] = useState<Listino[]>([])
  const [prodotti, setProdotti] = useState<Prodotto[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    anno: new Date().getFullYear().toString(),
    prodottoId: '', tipoCliente: 'Privato', formato: 'kg',
    unitaMisura: 'kg', prezzoBase: '', dataInizio: '', dataFine: '', note: ''
  })

  async function fetchData() {
    try {
      setLoading(true)
      const [resListino, resProdotti] = await Promise.all([
        fetch('/api/listino'),
        fetch('/api/prodotti')
      ])
      if (!resListino.ok || !resProdotti.ok) throw new Error()
      setData(await resListino.json())
      setProdotti(await resProdotti.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        anno: parseInt(form.anno),
        prodottoId: parseInt(form.prodottoId),
        tipoCliente: form.tipoCliente,
        formato: form.formato,
        unitaMisura: form.unitaMisura,
        prezzoBase: parseFloat(form.prezzoBase),
        dataInizio: form.dataInizio ? new Date(form.dataInizio).toISOString() : null,
        dataFine: form.dataFine ? new Date(form.dataFine).toISOString() : null,
        note: form.note || null
      }
      const res = await fetch('/api/listino', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ anno: new Date().getFullYear().toString(), prodottoId: '', tipoCliente: 'Privato', formato: 'kg', unitaMisura: 'kg', prezzoBase: '', dataInizio: '', dataFine: '', note: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Listino Prezzi" description="Gestione listino prezzi" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Prezzo</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Anno</Th><Th>Prodotto</Th><Th>Varietà</Th><Th>Tipo Cliente</Th><Th>Formato</Th><Th>Prezzo Base</Th><Th>Periodo Validità</Th><Th>Stato</Th></Tr>
              </Thead>
              <Tbody>
                {data.map((l) => (
                  <Tr key={l.id}>
                    <Td>{l.anno}</Td>
                    <Td className="font-medium">{l.prodotto.nome}</Td>
                    <Td>{l.prodotto.varietaTipologia || '-'}</Td>
                    <Td><Badge variant="info">{l.tipoCliente}</Badge></Td>
                    <Td>{l.formato}</Td>
                    <Td>{formatEuro(l.prezzoBase)}</Td>
                    <Td>{l.dataInizio ? `${formatDate(l.dataInizio)} - ${l.dataFine ? formatDate(l.dataFine) : ''}` : '-'}</Td>
                    <Td><Badge variant={l.attivo ? 'success' : 'default'}>{l.attivo ? 'Attivo' : 'Disattivo'}</Badge></Td>
                  </Tr>
                ))}
                {data.length === 0 && <Tr><Td colSpan={8} className="text-center text-gray-500 py-8">Nessun prezzo trovato</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Prezzo" className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Anno</label><Input type="number" value={form.anno} onChange={(e) => setForm({ ...form, anno: e.target.value })} required /></div>
            <div><label className="text-sm font-medium block mb-1">Prodotto</label>
              <Select value={form.prodottoId} onChange={(e) => setForm({ ...form, prodottoId: e.target.value })} required>
                <option value="">Seleziona...</option>
                {prodotti.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Tipo Cliente</label>
              <Select value={form.tipoCliente} onChange={(e) => setForm({ ...form, tipoCliente: e.target.value })}>
                <option value="Privato">Privato</option>
                <option value="Ingrosso">Ingrosso</option>
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Formato</label>
              <Select value={form.formato} onChange={(e) => setForm({ ...form, formato: e.target.value })}>
                <option value="vasetto 250g">vasetto 250g</option>
                <option value="vasetto 500g">vasetto 500g</option>
                <option value="vasetto 1kg">vasetto 1kg</option>
                <option value="kg sfuso">kg sfuso</option>
                <option value="kg">kg</option>
                <option value="cassetta">cassetta</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Unità Misura</label><Input value={form.unitaMisura} onChange={(e) => setForm({ ...form, unitaMisura: e.target.value })} required /></div>
            <div><label className="text-sm font-medium block mb-1">Prezzo Base (€)</label><Input type="number" step="0.01" min="0" value={form.prezzoBase} onChange={(e) => setForm({ ...form, prezzoBase: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Data Inizio</label><Input type="date" value={form.dataInizio} onChange={(e) => setForm({ ...form, dataInizio: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Data Fine</label><Input type="date" value={form.dataFine} onChange={(e) => setForm({ ...form, dataFine: e.target.value })} /></div>
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
