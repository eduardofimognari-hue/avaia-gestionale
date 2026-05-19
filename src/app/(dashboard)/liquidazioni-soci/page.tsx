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
import { Plus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import { formatDate, formatEuro } from '@/lib/utils'

type Liquidazione = {
  id: number
  data: string
  socio: { nome: string; cognome: string }
  totaleCrediti: number
  totaleDebiti: number
  importoNetto: number
  periodoDa: string | null
  periodoA: string | null
  stato: string
  dataPagamento: string | null
  note: string | null
  movimenti: { id: number; tipo: string; importo: number; categoria: string | null; descrizione: string | null }[]
}

type Socio = { id: number; nome: string; cognome: string }

export default function LiquidazioniSociPage() {
  const [data, setData] = useState<Liquidazione[]>([])
  const [soci, setSoci] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [form, setForm] = useState({ data: '', socioId: '', periodoDa: '', periodoA: '', note: '' })

  async function fetchData() {
    try {
      setLoading(true)
      const [resLiq, resSoci] = await Promise.all([
        fetch('/api/liquidazioni-soci'),
        fetch('/api/soci')
      ])
      if (!resLiq.ok || !resSoci.ok) throw new Error()
      setData(await resLiq.json())
      setSoci(await resSoci.json())
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
        socioId: parseInt(form.socioId),
        periodoDa: form.periodoDa ? new Date(form.periodoDa).toISOString() : null,
        periodoA: form.periodoA ? new Date(form.periodoA).toISOString() : null,
        note: form.note || null
      }
      const res = await fetch('/api/liquidazioni-soci', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ data: '', socioId: '', periodoDa: '', periodoA: '', note: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Liquidazioni Soci" description="Compensazione periodica crediti/debiti soci" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuova Liquidazione</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Data</Th><Th>Socio</Th><Th>Crediti</Th><Th>Debiti</Th><Th>Netto</Th><Th>Periodo</Th><Th>Stato</Th></Tr>
              </Thead>
              <Tbody>
                {data.map((l) => (
                  <>
                    <Tr key={l.id} className="cursor-pointer hover:bg-gray-50" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                      <Td>{formatDate(l.data)}</Td>
                      <Td className="font-medium">{l.socio.nome} {l.socio.cognome}</Td>
                      <Td className="text-green-600 font-medium">{formatEuro(l.totaleCrediti)}</Td>
                      <Td className="text-red-600 font-medium">{formatEuro(l.totaleDebiti)}</Td>
                      <Td className="font-bold">
                        {l.importoNetto >= 0 ? (
                          <span className="text-green-700"><ArrowUpCircle className="w-3 h-3 inline mr-1" />{formatEuro(l.importoNetto)}</span>
                        ) : (
                          <span className="text-red-700"><ArrowDownCircle className="w-3 h-3 inline mr-1" />{formatEuro(Math.abs(l.importoNetto))}</span>
                        )}
                      </Td>
                      <Td>{l.periodoDa && l.periodoA ? `${formatDate(l.periodoDa)} - ${formatDate(l.periodoA)}` : '-'}</Td>
                      <Td><Badge variant={l.stato === 'pagato' ? 'success' : 'warning'}>{l.stato === 'pagato' ? 'Pagato' : 'Da pagare'}</Badge></Td>
                    </Tr>
                    {expanded === l.id && l.movimenti.length > 0 && (
                      <Tr key={`detail-${l.id}`}>
                        <Td colSpan={7} className="bg-gray-50 p-0">
                          <div className="px-6 py-3">
                            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">Movimenti inclusi:</p>
                            {l.movimenti.map((m) => (
                              <div key={m.id} className="flex items-center gap-3 text-sm py-1">
                                <Badge variant={m.tipo === 'credito' ? 'info' : 'warning'} className="w-16 justify-center">{m.tipo}</Badge>
                                <span className="font-medium w-20">{formatEuro(m.importo)}</span>
                                <span className="text-gray-500 w-24">{m.categoria || '-'}</span>
                                <span className="text-gray-400">{m.descrizione || ''}</span>
                              </div>
                            ))}
                          </div>
                        </Td>
                      </Tr>
                    )}
                  </>
                ))}
                {data.length === 0 && <Tr><Td colSpan={7} className="text-center text-gray-500 py-8">Nessuna liquidazione trovata</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuova Liquidazione">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Data</label><Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} required /></div>
            <div><label className="text-sm font-medium block mb-1">Socio</label>
              <Select value={form.socioId} onChange={(e) => setForm({ ...form, socioId: e.target.value })} required>
                <option value="">Seleziona...</option>
                {soci.map((s) => <option key={s.id} value={s.id}>{s.nome} {s.cognome}</option>)}
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Periodo da</label><Input type="date" value={form.periodoDa} onChange={(e) => setForm({ ...form, periodoDa: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Periodo a</label><Input type="date" value={form.periodoA} onChange={(e) => setForm({ ...form, periodoA: e.target.value })} /></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Note</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            La liquidazione calcolerà automaticamente il netto tra crediti e debiti non ancora liquidati del socio nel periodo selezionato.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Calcolo in corso...' : 'Calcola e Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
