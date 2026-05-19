'use client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    const form = new FormData(e.currentTarget)
    const res = await signIn('credentials', {
      email: form.get('email'),
      password: form.get('password'),
      redirect: false,
    })
    setLoading(false)
    if (res?.error) setError('Email o password non validi')
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-gray-100 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-200 mb-4">
            <span className="text-white font-bold text-2xl">A</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">avaia</h1>
          <p className="text-gray-400 text-sm font-medium uppercase tracking-wider mt-0.5">Gestionale</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-7 space-y-5">
          <h2 className="text-lg font-semibold text-center text-gray-800">Accedi</h2>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 p-3 rounded-xl border border-red-100">{error}</p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-gray-600">Email</Label>
            <Input id="email" name="email" type="email" required placeholder="admin@azienda.it"
              className="h-11 rounded-xl border-gray-200 focus:border-primary-400 focus:ring-primary-400" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-600">Password</Label>
            <Input id="password" name="password" type="password" required placeholder="••••••••"
              className="h-11 rounded-xl border-gray-200 focus:border-primary-400 focus:ring-primary-400" />
          </div>
          <Button type="submit" disabled={loading}
            className="w-full h-11 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 shadow-lg shadow-primary-200 transition-all">
            {loading ? 'Accesso in corso...' : 'Accedi'}
          </Button>
          <p className="text-xs text-gray-300 text-center">demo: admin@kairos.it / avaia-demo</p>
        </form>
      </div>
    </div>
  )
}
