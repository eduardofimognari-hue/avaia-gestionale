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
  tipologia: string
  categoria: string
  usoAziendale: boolean
  terrenoId: number | null
  indirizzo: string | null
  comune: string | null
  provincia: string | null
  cap: string | null
  note: string | null
  attivo: boolean
}

type Terreno = { id: number; nome: string }

export default function LuoghiPage() {
  const [data, setData] = useState<Luogo[]>([])
  const [terreni, setTerreni] = useState<Terreno[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState<Luogo | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)

  const [filtroTipologia, setFiltroTipologia] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroUso, setFiltroUso] = useState('')

  const [form, setForm] = useState({
    nome: '', tipologia: 'reale', categoria: 'produttivo', usoAziendale: true,
    terrenoId: '', indirizzo: '', comune: '', provincia: '', cap: '', note: '',
  })

  async function fetchData() {
    try {
      setLoading(true)
      const [res, resTerreni] = await Promise.all([fetch('/api/luoghi'), fetch('/api/terreni')])
      if (!res.ok) throw new Error()
      setData(await res.json())
      if (resTerreni.ok) setTerreni(await resTerreni.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const dataFiltrate = data.filter(l => {
    if (filtroTipologia && l.tipologia !== filtroTipologia) return false
    if (filtroCategoria && l.categoria !== filtroCategoria) return false
    if (filtroUso === 'aziendale' && !l.usoAziendale) return false
    if (filtroUso === 'esterno' && l.usoAziendale) return false
    return true
  })

  const resetForm = () => setForm({
    nome: '', tipologia: 'reale', categoria: 'produttivo', usoAziendale: true,
    terrenoId: '', indirizzo: '', comune: '', provincia: '', cap: '', note: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body: Record<string, unknown> = { ...form, terrenoId: form.terrenoId ? parseInt(form.terrenoId) : null }
      const res = await fetch('/api/luoghi', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      resetForm()
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  function openEdit(l: Luogo) {
    setSelectedItem(l)
    setForm({
      nome: l.nome, tipologia: l.tipologia, categoria: l.categoria, usoAziendale: l.usoAziendale,
      terrenoId: l.terrenoId?.toString() || '',
      indirizzo: l.indirizzo || '', comune: l.comune || '', provincia: l.provincia || '',
      cap: l.cap || '', note: l.note || '',
    })
    setEditModalOpen(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedItem) return
    setSaving(true)
    try {
      const body: Record<string, unknown> = { ...form, terrenoId: form.terrenoId ? parseInt(form.terrenoId) : null }
      const res = await fetch(`/api/luoghi/${selectedItem.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
      setEditModalOpen(false)
      setSelectedItem(null)
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  const tipologiaBadge = (v: string) => v === 'reale' ? 'default' : 'warning'
  const categoriaBadge = (v: string) => v === 'produttivo' ? 'success' : 'default'
  const usoBadge = (v: boolean) => v ? 'info' : 'default'

  const FiltroBtn = ({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
        active ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div>
      <PageHeader title="Luoghi" description="Luoghi, sedi e centri di costo" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Luogo</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Filtri */}
      <div className="flex flex-wrap gap-6 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase">Tipologia</span>
          <FiltroBtn label="Tutti" active={!filtroTipologia} onClick={() => setFiltroTipologia('')} />
          <FiltroBtn label="Reale" active={filtroTipologia === 'reale'} onClick={() => setFiltroTipologia('reale')} />
          <FiltroBtn label="Virtuale" active={filtroTipologia === 'virtuale'} onClick={() => setFiltroTipologia('virtuale')} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase">Categoria</span>
          <FiltroBtn label="Tutti" active={!filtroCategoria} onClick={() => setFiltroCategoria('')} />
          <FiltroBtn label="Produttivo" active={filtroCategoria === 'produttivo'} onClick={() => setFiltroCategoria('produttivo')} />
          <FiltroBtn label="Non produttivo" active={filtroCategoria === 'non_produttivo'} onClick={() => setFiltroCategoria('non_produttivo')} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 uppercase">Uso</span>
          <FiltroBtn label="Tutti" active={!filtroUso} onClick={() => setFiltroUso('')} />
          <FiltroBtn label="Aziendale" active={filtroUso === 'aziendale'} onClick={() => setFiltroUso('aziendale')} />
          <FiltroBtn label="Esterno" active={filtroUso === 'esterno'} onClick={() => setFiltroUso('esterno')} />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr>
                  <Th>Nome</Th>
                  <Th>Tipologia</Th>
                  <Th>Categoria</Th>
                  <Th>Uso</Th>
                  <Th>Terreno</Th>
                  <Th>Indirizzo</Th>
                  <Th>Comune</Th>
                  <Th>Stato</Th>
                </Tr>
              </Thead>
              <Tbody>
                {dataFiltrate.map((l) => (
                  <Tr key={l.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openEdit(l)}>
                    <Td className="font-medium">{l.nome}</Td>
                    <Td><Badge variant={tipologiaBadge(l.tipologia) as 'default' | 'success' | 'warning' | 'danger' | 'info'}>{l.tipologia}</Badge></Td>
                    <Td><Badge variant={categoriaBadge(l.categoria) as 'default' | 'success' | 'warning' | 'danger' | 'info'}>{l.categoria === 'produttivo' ? 'Produttivo' : 'Non produttivo'}</Badge></Td>
                    <Td><Badge variant={usoBadge(l.usoAziendale) as 'default' | 'success' | 'warning' | 'danger' | 'info'}>{l.usoAziendale ? 'Aziendale' : 'Esterno'}</Badge></Td>
                    <Td>{l.terrenoId ? terreni.find(t => t.id === l.terrenoId)?.nome || '-' : '-'}</Td>
                    <Td>{l.indirizzo || '-'}</Td>
                    <Td>{l.comune || '-'}</Td>
                    <Td><Badge variant={l.attivo ? 'success' : 'default'}>{l.attivo ? 'Attivo' : 'Disattivo'}</Badge></Td>
                  </Tr>
                ))}
                {dataFiltrate.length === 0 && <Tr><Td colSpan={8} className="text-center text-gray-500 py-8">Nessun luogo trovato</Td></Tr>}
              </Tbody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setSelectedItem(null) }} title={`Modifica Luogo - ${selectedItem?.nome}`}>
        {selectedItem && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium block mb-1">Nome</label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
              <div><label className="text-sm font-medium block mb-1">Tipologia</label>
                <Select value={form.tipologia} onChange={(e) => setForm({ ...form, tipologia: e.target.value })}>
                  <option value="reale">Reale</option>
                  <option value="virtuale">Virtuale</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-sm font-medium block mb-1">Categoria</label>
                <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  <option value="produttivo">Produttivo</option>
                  <option value="non_produttivo">Non produttivo</option>
                </Select>
              </div>
              <div><label className="text-sm font-medium block mb-1">Uso</label>
                <Select value={form.usoAziendale ? 'aziendale' : 'esterno'} onChange={(e) => setForm({ ...form, usoAziendale: e.target.value === 'aziendale' })}>
                  <option value="aziendale">Aziendale</option>
                  <option value="esterno">Esterno</option>
                </Select>
              </div>
            </div>
            {form.tipologia === 'reale' && form.categoria === 'produttivo' && (
              <div><label className="text-sm font-medium block mb-1">Terreno</label>
                <Select value={form.terrenoId} onChange={(e) => setForm({ ...form, terrenoId: e.target.value })}>
                  <option value="">Nessuno</option>
                  {terreni.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </Select>
              </div>
            )}
            <div><label className="text-sm font-medium block mb-1">Indirizzo</label><Input value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div><label className="text-sm font-medium block mb-1">Comune</label><Input value={form.comune} onChange={(e) => setForm({ ...form, comune: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">Provincia</label><Input value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} /></div>
              <div><label className="text-sm font-medium block mb-1">CAP</label><Input value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value })} /></div>
            </div>
            <div><label className="text-sm font-medium block mb-1">Note</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setEditModalOpen(false); setSelectedItem(null) }}>Annulla</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiorna Luogo'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm() }} title="Nuovo Luogo">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Nome</label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div><label className="text-sm font-medium block mb-1">Tipologia</label>
              <Select value={form.tipologia} onChange={(e) => setForm({ ...form, tipologia: e.target.value })}>
                <option value="reale">Reale</option>
                <option value="virtuale">Virtuale</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Categoria</label>
              <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                <option value="produttivo">Produttivo</option>
                <option value="non_produttivo">Non produttivo</option>
              </Select>
            </div>
            <div><label className="text-sm font-medium block mb-1">Uso</label>
              <Select value={form.usoAziendale ? 'aziendale' : 'esterno'} onChange={(e) => setForm({ ...form, usoAziendale: e.target.value === 'aziendale' })}>
                <option value="aziendale">Aziendale</option>
                <option value="esterno">Esterno</option>
              </Select>
            </div>
          </div>
          {form.tipologia === 'reale' && form.categoria === 'produttivo' && (
            <div><label className="text-sm font-medium block mb-1">Terreno</label>
              <Select value={form.terrenoId} onChange={(e) => setForm({ ...form, terrenoId: e.target.value })}>
                <option value="">Nessuno</option>
                {terreni.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </Select>
            </div>
          )}
          <div><label className="text-sm font-medium block mb-1">Indirizzo</label><Input value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-4">
            <div><label className="text-sm font-medium block mb-1">Comune</label><Input value={form.comune} onChange={(e) => setForm({ ...form, comune: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Provincia</label><Input value={form.provincia} onChange={(e) => setForm({ ...form, provincia: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">CAP</label><Input value={form.cap} onChange={(e) => setForm({ ...form, cap: e.target.value })} /></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Note</label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => { setModalOpen(false); resetForm() }}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
