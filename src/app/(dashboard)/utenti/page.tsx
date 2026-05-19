'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useEffect, useState } from 'react'

interface Utente {
  id: number
  email: string
  nome: string
  ruolo: string
  attivo: boolean
  creatoIl: string
}

export default function UtentiPage() {
  const [utenti, setUtenti] = useState<Utente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ email: '', nome: '', password: '', ruolo: 'editor' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/utenti')
      .then((r) => { if (!r.ok) throw new Error('Non autorizzato'); return r.json() })
      .then((data) => setUtenti(data))
      .catch(() => setError('Accesso negato - solo admin può gestire utenti'))
      .finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/utenti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Errore')
      return
    }
    setShowForm(false)
    setForm({ email: '', nome: '', password: '', ruolo: 'editor' })
    const data = await fetch('/api/utenti').then((r) => r.json())
    setUtenti(data)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Utenti</h1>
          <p className="text-sm text-gray-500 mt-1">Gestisci gli account di accesso al gestionale</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Annulla' : 'Nuovo Utente'}
        </Button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>
      )}

      {showForm && (
        <Card>
          <CardHeader><h3 className="text-lg font-semibold">Nuovo Utente</h3></CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Ruolo</Label>
                  <select value={form.ruolo} onChange={(e) => setForm({ ...form, ruolo: e.target.value })}
                    className="w-full h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm focus:border-primary-400 focus:ring-primary-400">
                    <option value="editor">Editor (app totale)</option>
                    <option value="admin">Admin (tutto)</option>
                  </select>
                </div>
              </div>
              <Button type="submit" disabled={saving}>
                {saving ? 'Creazione...' : 'Crea Utente'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-400">Caricamento...</p>
      ) : (
        <div className="space-y-2">
          {utenti.map((u) => (
            <div key={u.id} className="flex items-center justify-between bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div>
                <p className="font-medium text-gray-900">{u.nome}</p>
                <p className="text-sm text-gray-500">{u.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={u.ruolo === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                  {u.ruolo === 'admin' ? 'Admin' : 'Editor'}
                </Badge>
                {u.attivo ? (
                  <Badge className="bg-green-100 text-green-700">Attivo</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-700">Disattivato</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}