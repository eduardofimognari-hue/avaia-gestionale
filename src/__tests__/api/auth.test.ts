import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET as getUtenti, POST as postUtenti } from '@/app/api/utenti/route'
import { POST as postSoci } from '@/app/api/soci/route'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'

function mockRequest(body?: unknown): Request {
  return { json: vi.fn().mockResolvedValue(body) } as unknown as Request
}

describe('Protezione API routes', () => {
  beforeEach(() => {
    vi.mocked(getCurrentAziendaId).mockResolvedValue(1)
  })

  it('GET /api/utenti richiede admin', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      allowed: false,
      response: new Response(JSON.stringify({ error: 'Permessi insufficienti' }), { status: 403 }) as any,
    })
    const res = await getUtenti()
    expect(res.status).toBe(403)
  })

  it('POST /api/utenti richiede admin', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      allowed: false,
      response: new Response(JSON.stringify({ error: 'Permessi insufficienti' }), { status: 403 }) as any,
    })
    const req = mockRequest({ email: 'test@test.it', nome: 'Test', password: '123456' })
    const res = await postUtenti(req)
    expect(res.status).toBe(403)
  })

  it('POST /api/soci richiede almeno editor', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      allowed: false,
      response: new Response(JSON.stringify({ error: 'Permessi insufficienti' }), { status: 403 }) as any,
    })
    const req = mockRequest({ nome: 'Mario', cognome: 'Rossi' })
    const res = await postSoci(req)
    expect(res.status).toBe(403)
  })

  it('GET /api/utenti permette admin', async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({
      allowed: true, response: null, utente: { id: 1, ruolo: 'admin' } as any,
    })
    const res = await getUtenti()
    expect(res.status).not.toBe(403)
  })
})
