import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '@/app/api/soci/route'
import { mockPrisma } from '../setup'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'

function mockRequest(body?: unknown): Request {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Request
}

describe('GET /api/soci', () => {
  beforeEach(() => {
    vi.mocked(getCurrentAziendaId).mockResolvedValue(1)
  })

  it('restituisce lista soci per azienda', async () => {
    const mockSoci = [
      { id: 1, nome: 'Mario', cognome: 'Rossi', attivo: true, responsabilita: [], ruoli: [] },
    ]
    vi.mocked(mockPrisma.soci.findMany).mockResolvedValue(mockSoci)

    const res = await GET()
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toEqual(mockSoci)
    expect(mockPrisma.soci.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { attivo: true, aziendaId: 1 } })
    )
  })

  it('restituisce 400 senza azienda', async () => {
    vi.mocked(getCurrentAziendaId).mockResolvedValue(null)
    const res = await GET()
    expect(res.status).toBe(400)
  })
})

describe('POST /api/soci', () => {
  beforeEach(() => {
    vi.mocked(getCurrentAziendaId).mockResolvedValue(1)
    vi.mocked(requireRole).mockResolvedValue({ allowed: true, response: null, utente: { id: 1, email: 'admin@test.it', nome: 'Admin', ruolo: 'admin', attivo: true, aziendaId: 1 } as any })
    vi.mocked(mockPrisma.soci.create).mockResolvedValue({ id: 1, nome: 'Mario', cognome: 'Rossi', responsabilita: [], ruoli: [] })
  })

  it('crea socio con dati validi', async () => {
    const req = mockRequest({ nome: 'Mario', cognome: 'Rossi' })
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.nome).toBe('Mario')
  })

  it('rifiuta dati senza nome', async () => {
    const req = mockRequest({ cognome: 'Rossi' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
