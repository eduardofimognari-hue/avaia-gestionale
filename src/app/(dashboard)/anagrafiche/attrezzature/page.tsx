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
import { formatEuro } from '@/lib/utils'
import { ExportButton } from '@/components/ui/export-button'

type Fornitore = { id: number; nome: string; cognome: string | null; ragioneSociale: string | null }
type Attrezzatura = {
  id: number; nome: string; categoria: string | null; fornitore: Fornitore | null
  fornitoreId: number | null; costoUnitario: number | null
  unitaMisura: string; scortaMinima: number | null; quantita: number
  note: string | null; attivo: boolean
}

export default function AttrezzaturePage() {
  const [data, setData] = useState<Attrezzatura[]>([])
  const [fornitori, setFornitori] = useState<Fornitore[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Attrezzatura | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nome: '', categoria: 'attrezzatura', fornitoreId: '', costoUnitario: '',
    unitaMisura: 'pezzi', scortaMinima: '', quantita: '0', note: ''
  })

  async function fetchData() {
    try {
      setLoading(true)
      const [res, resForn] = await Promise.all([fetch('/api/attrezzature'), fetch('/api/fornitori')])
      if (!res.ok) throw new Error()
      setData(await res.json())
      setFornitori(await resForn.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        nome: form.nome, categoria: form.categoria || null,
        fornitoreId: form.fornitoreId ? parseInt(form.fornitoreId) : null,
        costoUnitario: form.costoUnitario ? parseFloat(form.costoUnitario) : null,
        unitaMisura: form.unitaMisura, scortaMinima: form.scortaMinima ? parseFloat(form.scortaMinima) : null,
        quantita: parseFloat(form.quantita) || 0, note: form.note || null,
      }
      const res = await fetch('/api/attrezzature', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ nome: '', categoria: 'attrezzatura', fornitoreId: '', costoUnitario: '', unitaMisura: 'pezzi', scortaMinima: '', quantita: '0', note: '' })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  function openEdit(a: Attrezzatura) {
    setSelectedItem(a)
    setForm({
      nome: a.nome, categoria: a.categoria || 'attrezzatura', fornitoreId: a.fornitoreId?.toString() || '',
      costoUnitario: a.costoUnitario?.toString() || '', unitaMisura: a.unitaMisura,
      scortaMinima: a.scortaMinima?.toString() || '', quantita: a.quantita.toString(), note: a.note || '',
    })
    setEditModalOpen(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedItem) return
    setSaving(true)
    try {
      const body = {
        nome: form.nome, categoria: form.categoria || null,
        fornitoreId: form.fornitoreId ? parseInt(form.fornitoreId) : null,
        costoUnitario: form.costoUnitario ? parseFloat(form.costoUnitario) : null,
        unitaMisura: form.unitaMisura, scortaMinima: form.scortaMinima ? parseFloat(form.scortaMinima) : null,
        quantita: parseFloat(form.quantita) || 0, note: form.note || null,
      }
      const res = await fetch(`/api/attrezzature/${selectedItem.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error()
      setEditModalOpen(false)
      setSelectedItem(null)
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  const inScorta = (a: Attrezzatura) => a.scortaMinima && a.quantita <= a.scortaMinima

  return (
    <div>
      <PageHeader title="Attrezzature" description="Gestione attrezzature, macchinari e materiali di consumo"
        action={<div className="flex items-center gap-2"><ExportButton risorsa="attrezzature" /><Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuova Attrezzatura</Button></div>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (<p className="text-gray-500">Caricamento...</p>) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Nome</Th><Th>Categoria</Th><Th>Fornitore</Th><Th>Costo Unit.</Th><Th>Unità</Th><Th>Q.tà</Th><Th>Scorta Min.</Th><Th>Stato</Th></Tr>
              </Thead>
              <Tbody>
                {data.map((a) => (
                  <Tr key={a.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openEdit(a)}>
                    <Td className="font-medium">{a.nome}</Td>
                    <Td>{a.categoria ? <Badge variant="info">{a.categoria}</Badge> : '-'}</Td>
                    <Td>{a.fornitore ? (a.fornitore.ragioneSociale || `${a.fornitore.nome} ${a.fornitore.cognome || ''}`) : '-'}</Td>
                    <Td>{a.costoUnitario != null ? formatEuro(a.costoUnitario) : '-'}</Td>
                    <Td>{a.unitaMisura}</Td>
                    <Td className={inScorta(a) ? 'text-amber-600 font-bold' : ''}>{a.quantita}</Td>
                    <Td>{a.scortaMinima != null ? a.scortaMinima : '-'}</Td>
                    <Td><Badge variant={a.attivo ? 'success' : 'default'}>{a.attivo ? 'Attivo' : 'Disattivo'}</Badge></Td>
                  </Tr>
                ))}
                {data.length === 0 && <Tr><Td colSpan={8} className="text-center text-gray-500 py-8">Nessuna attrezzatura trovata</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setSelectedItem(null) }} title={`Modifica - ${selectedItem?.nome}`}>
        {selectedItem && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium block mb-1">Nome</label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div><label className="text-sm font-medium block mb-1">Categoria</label>
                <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  <option value="attrezzatura">Attrezzatura</option>
                  <option value="macchinario">Macchinario</option>
                  <option value="strumento">Strumento</option>
                  <option value="materiale consumo">Materiale di consumo</option>
                  <option value="altro">Altro</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium block mb-1">Fornitore</label>
                <Select value={form.fornitoreId} onChange={(e) => setForm({ ...form, fornitoreId: e.target.value })}>
                  <option value="">Nessuno</option>
                  {fornitori.map(f => (
                    <option key={f.id} value={f.id}>{f.ragioneSociale || `${f.nome} ${f.cognome || ''}`}</option>
                  ))}
                </Select>
              </div>
              <div><label className="text-sm font-medium block mb-1">Costo Unitario (€)</label><Input type="number" step="0.01" min="0" value={form.costoUnitario} onChange={(e) => setForm({ ...form, costoUnitario: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-sm font-medium block mb-1">Unità di Misura</label>
                <Select value={form.unitaMisura} onChange={(e) => setForm({ ...form, unitaMisura: e.target.value })}>
                  <option value="pezzi">Pezzi</option>
                  <option value="kg">kg</option>
                  <option value="litri">Litri</option>
                  <option value="metri">Metri</option>
                  <option value="ore">Ore</option>
                </Select>
              </div>
              <div><label className="text-sm font-medium block mb-1">Quantità</label><Input type="number" step="0.01" min="0" value={form.quantita} onChange={(e) => setForm({ ...form, quantita: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Scorta Minima</label><Input type="number" step="0.01" min="0" value={form.scortaMinima} onChange={(e) => setForm({ ...form, scortaMinima: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium block mb-1">Note</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setEditModalOpen(false); setSelectedItem(null) }}>Annulla</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiorna'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuova Attrezzatura">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Nome</label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div><label className="text-sm font-medium block mb-1">Categoria</label>
              <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                <option value="attrezzatura">Attrezzatura</option>
                <option value="macchinario">Macchinario</option>
                <option value="strumento">Strumento</option>
                <option value="materiale consumo">Materiale di consumo</option>
                <option value="altro">Altro</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Fornitore</label>
              <Select value={form.fornitoreId} onChange={(e) => setForm({ ...form, fornitoreId: e.target.value })}>
                <option value="">Nessuno</option>
                {fornitori.map(f => (
                  <option key={f.id} value={f.id}>{f.ragioneSociale || `${f.nome} ${f.cognome || ''}`}</option>
                ))}
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Costo Unitario (€)</label><Input type="number" step="0.01" min="0" value={form.costoUnitario} onChange={(e) => setForm({ ...form, costoUnitario: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-sm font-medium block mb-1">Unità di Misura</label>
              <Select value={form.unitaMisura} onChange={(e) => setForm({ ...form, unitaMisura: e.target.value })}>
                <option value="pezzi">Pezzi</option>
                <option value="kg">kg</option>
                <option value="litri">Litri</option>
                <option value="metri">Metri</option>
                <option value="ore">Ore</option>
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Quantità</label><Input type="number" step="0.01" min="0" value={form.quantita} onChange={(e) => setForm({ ...form, quantita: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Scorta Minima</label><Input type="number" step="0.01" min="0" value={form.scortaMinima} onChange={(e) => setForm({ ...form, scortaMinima: e.target.value })} /></div>
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