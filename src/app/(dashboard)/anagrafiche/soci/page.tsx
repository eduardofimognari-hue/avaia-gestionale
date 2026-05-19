'use client'

import { useState, useEffect } from 'react'
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
  id: number
  nome: string
  cognome: string
  telefono: string | null
  email: string | null
  attivo: boolean
  responsabilita: AreaResp[]
  ruoli: RuoloAss[]
}

export default function SociPage() {
  const [data, setData] = useState<Socio[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [aree, setAree] = useState<{ id: number; nome: string }[]>([])
  const [ruoliList, setRuoliList] = useState<{ id: number; nome: string }[]>([])
  const [form, setForm] = useState({
    nome: '', cognome: '', codiceFiscale: '', telefono: '', email: '',
    indirizzo: '', dataIngresso: '', note: '',
    responsabilita: [] as number[],
    ruoli: [] as number[],
  })

  async function fetchData() {
    try {
      setLoading(true)
      const res = await fetch('/api/soci')
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch { setError('Errore caricamento dati') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    Promise.all([
      fetch('/api/aree').then(r => r.json()),
      fetch('/api/ruoli').then(r => r.json()),
    ]).then(([a, r]) => { setAree(a); setRuoliList(r) }).catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/soci', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, dataIngresso: form.dataIngresso ? new Date(form.dataIngresso).toISOString() : null })
      })
      if (!res.ok) throw new Error()
      setModalOpen(false)
      setForm({ nome: '', cognome: '', codiceFiscale: '', telefono: '', email: '', indirizzo: '', dataIngresso: '', note: '', responsabilita: [], ruoli: [] })
      await fetchData()
    } catch { setError('Errore durante il salvataggio') }
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader title="Soci" description="Gestione soci e collaboratori" action={<Button onClick={() => setModalOpen(true)}><Plus className="w-4 h-4 mr-2" />Nuovo Socio</Button>} />
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-500">Caricamento...</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <Thead>
                <Tr><Th>Nome</Th><Th>Cognome</Th><Th>Ruoli</Th><Th>Responsabilità</Th><Th>Telefono</Th><Th>Email</Th><Th>Stato</Th></Tr>
              </Thead>
              <Tbody>
                {data.map((s) => (
                  <Tr key={s.id}>
                    <Td className="font-medium">{s.nome}</Td>
                    <Td>{s.cognome}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {s.ruoli?.length > 0
                          ? s.ruoli.map(r => <Badge key={r.ruolo.id} variant="info">{r.ruolo.nome}</Badge>)
                          : <span className="text-gray-400">-</span>}
                      </div>
                    </Td>
                    <Td className="max-w-[200px]">
                      <div className="flex flex-wrap gap-1">
                        {s.responsabilita?.length > 0
                          ? s.responsabilita.map(r => <Badge key={r.area.id} variant="default">{r.area.nome}</Badge>)
                          : <span className="text-gray-400">-</span>}
                      </div>
                    </Td>
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
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nuovo Socio">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Nome</label><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required /></div>
            <div><label className="text-sm font-medium block mb-1">Cognome</label><Input value={form.cognome} onChange={(e) => setForm({ ...form, cognome: e.target.value })} required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Codice Fiscale</label><Input value={form.codiceFiscale} onChange={(e) => setForm({ ...form, codiceFiscale: e.target.value })} /></div>
            <div><label className="text-sm font-medium block mb-1">Telefono</label><Input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></div>
          </div>
          <div><label className="text-sm font-medium block mb-1">Email</label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
          <div><label className="text-sm font-medium block mb-1">Indirizzo</label><Input value={form.indirizzo} onChange={(e) => setForm({ ...form, indirizzo: e.target.value })} /></div>

          <div><label className="text-sm font-medium block mb-1">Ruoli</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {ruoliList.map(r => (
                <label key={r.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.ruoli.includes(r.id)}
                    onChange={(e) => setForm({
                      ...form,
                      ruoli: e.target.checked ? [...form.ruoli, r.id] : form.ruoli.filter((id: number) => id !== r.id)
                    })} />
                  {r.nome}
                </label>
              ))}
            </div>
          </div>

          <div><label className="text-sm font-medium block mb-1">Responsabilità (aree di lavoro)</label>
            <div className="flex flex-wrap gap-3 mt-1">
              {aree.map(a => (
                <label key={a.id} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.responsabilita.includes(a.id)}
                    onChange={(e) => setForm({
                      ...form,
                      responsabilita: e.target.checked ? [...form.responsabilita, a.id] : form.responsabilita.filter((id: number) => id !== a.id)
                    })} />
                  {a.nome}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-sm font-medium block mb-1">Data Ingresso</label><Input type="date" value={form.dataIngresso} onChange={(e) => setForm({ ...form, dataIngresso: e.target.value })} /></div>
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
