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
import { formatDate, formatNumber, formatEuro } from '@/lib/utils'

type Lavoro = {
  id: number
  data: string
  socio: { nome: string; cognome: string }
  area: { nome: string } | null
  luogo: { nome: string } | null
  ore: number
  costoOrario: number
  liquidato: boolean
}

type Socio = { id: number; nome: string; cognome: string }
type Luogo = { id: number; nome: string }
type Area = { id: number; nome: string }

export default function LavoroSociPage() {
  const [data, setData] = useState<Lavoro[]>([])
  const [soci, setSoci] = useState<Socio[]>([])
  const [luoghi, setLuoghi] = useState<Luogo[]>([])
  const [aree, setAree] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ data: '', socioId: '', luogoId: '', areaId: '', ore: '', descrizione: '' })

  async function fetchData() {
    try {
      setLoading(true)
      const [resLav, resSoci, resLuoghi, resAree] = await Promise.all([
        fetch('/api/lavoro'),
        fetch('/api/soci'),
        fetch('/api/luoghi'),
        fetch('/api/aree')
      ])
      if (!resLav.ok || !resSoci.ok || !resLuoghi.ok || !resAree.ok) throw new Error()
      setData(await resLav.json())
      setSoci(await resSoci.json())
      setLuoghi(await resLuoghi.json())
      setAree(await resAree.json())
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
        luogoId: form.luogoId ? parseInt(form.luogoId) : null,
        areaId: form.areaId ? parseInt(form.areaId) : null,
        ore: parseFloat(form.ore),
        descrizione: form.descrizione || null
      }
      const res = await fetch('/api/lavoro', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ data: '', socioId: '', luogoId: '', areaId: '', ore: '', descrizione: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Lavoro Soci" description="Registrazione ore lavoro per luogo e area" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuova Registrazione</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (<p className="text-gray-500">Caricamento...</p>) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Data</Th><Th>Socio</Th><Th>Luogo</Th><Th>Area lavoro</Th><Th>Ore</Th><Th>Costo</Th><Th>Liquidato</Th></Tr>
              </Thead>
              <Tbody>
                {data.map((l) => (
                  <Tr key={l.id}>
                    <Td>{formatDate(l.data)}</Td>
                    <Td className="font-medium">{l.socio.nome} {l.socio.cognome}</Td>
                    <Td>{l.luogo?.nome || '-'}</Td>
                    <Td>{l.area?.nome || '-'}</Td>
                    <Td>{formatNumber(l.ore, 1)}h</Td>
                    <Td className="font-medium">{formatEuro(l.ore * l.costoOrario)}</Td>
                    <Td><Badge variant={l.liquidato ? 'success' : 'warning'}>{l.liquidato ? 'Sì' : 'No'}</Badge></Td>
                  </Tr>
                ))}
                {data.length === 0 && <Tr><Td colSpan={7} className="text-center text-gray-500 py-8">Nessuna registrazione</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuova Registrazione">
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
            <div><label className="text-sm font-medium block mb-1">Luogo</label>
              <Select value={form.luogoId} onChange={(e) => setForm({ ...form, luogoId: e.target.value })}>
                <option value="">Seleziona...</option>
                {luoghi.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Area di lavoro</label>
              <Select value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })}>
                <option value="">Seleziona...</option>
                {aree.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </Select>
            </div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Ore</label><Input type="number" step="0.5" min="0" value={form.ore} onChange={(e) => setForm({ ...form, ore: e.target.value })} required /></div>
          <div><label className="text-sm font-medium block mb-1">Descrizione</label><Input value={form.descrizione} onChange={(e) => setForm({ ...form, descrizione: e.target.value })} /></div>
          <div className="text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
            Il costo orario viene applicato automaticamente in base alle tariffe del socio per l'area di lavoro selezionata.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
