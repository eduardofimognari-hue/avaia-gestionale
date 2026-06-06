'use client'
import { useState } from 'react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, Thead, Tbody, Tr, Th, Td } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'
import { Plus } from 'lucide-react'

type AreaResp = { area: { id: number; nome: string } }
type RuoloAss = { ruolo: { id: number; nome: string } }
type Socio = {
  id: number; nome: string; cognome: string; codiceFiscale: string | null
  telefono: string | null; email: string | null; indirizzo: string | null
  dataIngresso: string | null; note: string | null; attivo: boolean
  responsabilita: AreaResp[]; ruoli: RuoloAss[]
}

type Props = {
  initialData: Socio[]
  aree: { id: number; nome: string }[]
  ruoliList: { id: number; nome: string }[]
}

export function SociClient({ initialData, aree, ruoliList }: Props) {
  const [data, setData] = useState(initialData)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [selectedItem, setSelectedItem] = useState<Socio | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const emptyForm = { nome: '', cognome: '', codiceFiscale: '', telefono: '', email: '', indirizzo: '', dataIngresso: '', note: '', responsabilita: [] as number[], ruoli: [] as number[] }
  const [form, setForm] = useState(emptyForm)

  async function fetchData() {
    const res = await fetch('/api/soci')
    if (res.ok) setData(await res.json())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/soci', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dataIngresso: form.dataIngresso ? new Date(form.dataIngresso).toISOString() : null }),
      })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm(emptyForm)
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  function openEdit(s: Socio) {
    setSelectedItem(s)
    setForm({
      nome: s.nome, cognome: s.cognome, codiceFiscale: s.codiceFiscale || '',
      telefono: s.telefono || '', email: s.email || '', indirizzo: s.indirizzo || '',
      dataIngresso: s.dataIngresso ? s.dataIngresso.slice(0, 10) : '', note: s.note || '',
      responsabilita: s.responsabilita?.map(r => r.area.id) || [],
      ruoli: s.ruoli?.map(r => r.ruolo.id) || [],
    })
    setEditModalOpen(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedItem) return
    setSaving(true)
    try {
      const res = await fetch(`/api/soci/${selectedItem.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dataIngresso: form.dataIngresso ? new Date(form.dataIngresso).toISOString() : null }),
      })
      if (!res.ok) throw new Error()
      setEditModalOpen(false)
      setSelectedItem(null)
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  const FormFields = () => (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-sm font-medium block mb-1">Nome</label><Input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} required /></div>
        <div><label className="text-sm font-medium block mb-1">Cognome</label><Input value={form.cognome} onChange={e => setForm({ ...form, cognome: e.target.value })} required /></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-sm font-medium block mb-1">Codice Fiscale</label><Input value={form.codiceFiscale} onChange={e => setForm({ ...form, codiceFiscale: e.target.value })} /></div>
        <div><label className="text-sm font-medium block mb-1">Telefono</label><Input value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
      </div>
      <div><label className="text-sm font-medium block mb-1">Email</label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
      <div><label className="text-sm font-medium block mb-1">Indirizzo</label><Input value={form.indirizzo} onChange={e => setForm({ ...form, indirizzo: e.target.value })} /></div>
      <div><label className="text-sm font-medium block mb-1">Ruoli</label>
        <div className="flex flex-wrap gap-3 mt-1">
          {ruoliList.map(r => (
            <label key={r.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={form.ruoli.includes(r.id)} onChange={e => setForm({ ...form, ruoli: e.target.checked ? [...form.ruoli, r.id] : form.ruoli.filter(id => id !== r.id) })} />
              {r.nome}
            </label>
          ))}
        </div>
      </div>
      <div><label className="text-sm font-medium block mb-1">Responsabilità (aree di lavoro)</label>
        <div className="flex flex-wrap gap-3 mt-1">
          {aree.map(a => (
            <label key={a.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
              <input type="checkbox" checked={form.responsabilita.includes(a.id)} onChange={e => setForm({ ...form, responsabilita: e.target.checked ? [...form.responsabilita, a.id] : form.responsabilita.filter(id => id !== a.id) })} />
              {a.nome}
            </label>
          ))}
        </div>
      </div>
      <div><label className="text-sm font-medium block mb-1">Data Ingresso</label><Input type="date" value={form.dataIngresso} onChange={e => setForm({ ...form, dataIngresso: e.target.value })} /></div>
      <div><label className="text-sm font-medium block mb-1">Note</label><Input value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} /></div>
    </>
  )

  return (
    <div>
      <PageHeader title="Soci" description="Gestione soci e collaboratori" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Socio</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      <Card>
        <CardContent className="p-0">
          <Table>
            <Thead>
              <Tr><Th>Nome</Th><Th>Cognome</Th><Th>Ruoli</Th><Th>Responsabilità</Th><Th>Telefono</Th><Th>Email</Th><Th>Stato</Th></Tr>
            </Thead>
            <Tbody>
              {data.map((s) => (
                <Tr key={s.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openEdit(s)}>
                  <Td className="font-medium">{s.nome}</Td>
                  <Td>{s.cognome}</Td>
                  <Td><div className="flex flex-wrap gap-1">{s.ruoli?.length > 0 ? s.ruoli.map(r => <Badge key={r.ruolo.id} variant="info">{r.ruolo.nome}</Badge>) : <span className="text-gray-400">-</span>}</div></Td>
                  <Td className="max-w-[200px]"><div className="flex flex-wrap gap-1">{s.responsabilita?.length > 0 ? s.responsabilita.map(r => <Badge key={r.area.id} variant="default">{r.area.nome}</Badge>) : <span className="text-gray-400">-</span>}</div></Td>
                  <Td>{s.telefono || '-'}</Td>
                  <Td>{s.email || '-'}</Td>
                  <Td><Badge variant={s.attivo ? 'success' : 'default'}>{s.attivo ? 'Attivo' : 'Disattivo'}</Badge></Td>
                </Tr>
              ))}
              {data.length === 0 && <Tr><Td colSpan={7} className="text-center text-gray-500 py-8">Nessun socio trovato</Td></Tr>}
            </Tbody>
          </Table>
        </CardContent>
      </Card>

      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setSelectedItem(null) }} title={`Modifica Socio - ${selectedItem?.nome} ${selectedItem?.cognome}`}>
        {selectedItem && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <FormFields />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => { setEditModalOpen(false); setSelectedItem(null) }}>Annulla</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Aggiorna Socio'}</Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Socio">
        <form onSubmit={handleSubmit} className="space-y-4">
          <FormFields />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>Annulla</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Salvataggio...' : 'Salva'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
