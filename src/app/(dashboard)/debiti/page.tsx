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
import { formatDate, formatEuro } from '@/lib/utils'

type Debito = {
  id: number
  data: string
  cliente: { nome: string; cognome: string | null } | null
  importo: number
  descrizione: string | null
  scadenza: string | null
  stato: string
  vendita: { id: number; importoTotale: number; nota: string | null } | null
}

type Cliente = { id: number; nome: string; cognome: string | null }

export default function DebitiPage() {
  const [data, setData] = useState<Debito[]>([])
  const [clienti, setClienti] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ data: '', clienteId: '', importo: '', descrizione: '', scadenza: '', note: '' })

  async function fetchData() {
    try {
      setLoading(true)
      const [resDeb, resCli] = await Promise.all([
        fetch('/api/debiti'),
        fetch('/api/clienti')
      ])
      if (!resDeb.ok || !resCli.ok) throw new Error()
      setData(await resDeb.json())
      setClienti(await resCli.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        data: new Date(form.data).toISOString(),
        clienteId: form.clienteId ? parseInt(form.clienteId) : null,
        importo: parseFloat(form.importo),
        descrizione: form.descrizione || null,
        scadenza: form.scadenza ? new Date(form.scadenza).toISOString() : null,
        note: form.note || null
      }
      const res = await fetch('/api/debiti', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ data: '', clienteId: '', importo: '', descrizione: '', scadenza: '', note: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Debiti Clienti" description="Crediti verso clienti non saldati" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Debito</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Data</Th><Th>Cliente</Th><Th>Importo</Th><Th>Descrizione</Th><Th>Scadenza</Th><Th>Stato</Th></Tr>
              </Thead>
              <Tbody>
                {data.map((d) => (
                  <Tr key={d.id}>
                    <Td>{formatDate(d.data)}</Td>
                    <Td className="font-medium">
                      {d.cliente ? `${d.cliente.nome} ${d.cliente.cognome || ''}` : '-'}
                    </Td>
                    <Td>{formatEuro(d.importo)}</Td>
                    <Td>{d.descrizione || (d.vendita ? `Vendita #${d.vendita.id}` : '-')}</Td>
                    <Td>{d.scadenza ? formatDate(d.scadenza) : '-'}</Td>
                    <Td>
                      <Badge variant={d.stato === 'aperto' ? (d.scadenza && new Date(d.scadenza) < new Date() ? 'danger' : 'warning') : 'success'}>
                        {d.stato === 'aperto' ? (d.scadenza && new Date(d.scadenza) < new Date() ? 'Scaduto' : 'Aperto') : 'Saldato'}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
                {data.length === 0 && <Tr><Td colSpan={6} className="text-center text-gray-500 py-8">Nessun debito trovato</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Debito Cliente">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Data</label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required /></div>
            <div><label className="text-sm font-medium block mb-1">Cliente</label>
              <Select value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
                <option value="">Seleziona...</option>
                {clienti.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome} {c.cognome || ''}</option>
                ))}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Importo (€)</label><Input type="number" step="0.01" min="0" value={form.importo} onChange={(e) => setForm({ ...form, importo: e.target.value })} required /></div>
            <div><label className="text-sm font-medium block mb-1">Scadenza</label><Input type="date" value={form.scadenza} onChange={(e) => setForm({ ...form, scadenza: e.target.value })} /></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Descrizione</label><Input value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} /></div>
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
