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

type Movimento = {
  id: number
  data: string
  socio: { nome: string; cognome: string }
  tipo: string
  importo: number
  categoria: string | null
  descrizione: string | null
  liquidato: boolean
  liquidazione: { id: number; importoNetto: number; stato: string } | null
}

type Socio = { id: number; nome: string; cognome: string }

export default function MovimentiSociPage() {
  const [data, setData] = useState<Movimento[]>([])
  const [soci, setSoci] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ data: '', socioId: '', tipo: 'credito', importo: '', categoria: '', descrizione: '' })

  async function fetchData() {
    try {
      setLoading(true)
      const [resMov, resSoci] = await Promise.all([
        fetch('/api/movimenti-soci'),
        fetch('/api/soci')
      ])
      if (!resMov.ok || !resSoci.ok) throw new Error()
      setData(await resMov.json())
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
        tipo: form.tipo,
        importo: parseFloat(form.importo),
        categoria: form.categoria || null,
        descrizione: form.descrizione || null
      }
      const res = await fetch('/api/movimenti-soci', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ data: '', socioId: '', tipo: 'credito', importo: '', categoria: '', descrizione: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Crediti / Debiti Soci" description="Movimenti finanziari tra soci e azienda" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Movimento</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Data</Th><Th>Socio</Th><Th>Tipo</Th><Th>Importo</Th><Th>Categoria</Th><Th>Descrizione</Th><Th>Stato</Th></Tr>
              </Thead>
              <Tbody>
                {data.map((m) => (
                  <Tr key={m.id}>
                    <Td>{formatDate(m.data)}</Td>
                    <Td className="font-medium">{m.socio.nome} {m.socio.cognome}</Td>
                    <Td>
                      {m.tipo === 'credito' ? (
                        <Badge variant="info"><ArrowUpCircle className="w-3 h-3 mr-1" /> Credito</Badge>
                      ) : (
                        <Badge variant="warning"><ArrowDownCircle className="w-3 h-3 mr-1" /> Debito</Badge>
                      )}
                    </Td>
                    <Td className="font-medium">{formatEuro(m.importo)}</Td>
                    <Td>{m.categoria || '-'}</Td>
                    <Td>{m.descrizione || '-'}</Td>
                    <Td>
                      {m.liquidato
                        ? <Badge variant="success">Liquidato</Badge>
                        : <Badge variant="warning">Aperto</Badge>}
                    </Td>
                  </Tr>
                ))}
                {data.length === 0 && <Tr><Td colSpan={7} className="text-center text-gray-500 py-8">Nessun movimento trovato</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Movimento Socio">
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
            <div><label className="text-sm font-medium block mb-1">Tipo</label>
              <Select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="credito">Credito (socio anticipa, azienda deve)</option>
                <option value="debito">Debito (azienda anticipa, socio deve)</option>
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Importo (€)</label><Input type="number" step="0.01" min="0" value={form.importo} onChange={(e) => setForm({ ...form, importo: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Categoria</label>
              <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                <option value="">Seleziona...</option>
                <option value="materiali">Materiali</option>
                <option value="viaggio">Viaggio</option>
                <option value="anticipo">Anticipo</option>
                <option value="stipendio">Stipendio</option>
                <option value="rimborso km">Rimborso km</option>
                <option value="altro">Altro</option>
              </Select>
            </div>
            <div />
          </div>
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
