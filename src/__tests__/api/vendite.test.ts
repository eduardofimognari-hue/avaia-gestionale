import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/vendite/nuova/route'
import { mockPrisma } from '../setup'
import { getCurrentAziendaId } from '@/lib/azienda-context'

function mockRequest(body: unknown): Request {
  return { json: vi.fn().mockResolvedValue(body) } as unknown as Request
}

describe('POST /api/vendite/nuova', () => {
  const validBody = {
    data: '2024-06-15',
    tipoCliente: 'Privato',
    clienteId: 1,
    righe: [{ prodottoId: 1, formato: 'kg', quantita: 5, prezzoUnitario: 10 }],
  }

  beforeEach(() => {
    vi.mocked(getCurrentAziendaId).mockResolvedValue(1)
    vi.mocked(mockPrisma.$transaction).mockImplementation((fn: any) => fn(mockPrisma))
    vi.mocked(mockPrisma.vendite.create).mockResolvedValue({ id: 1, importoTotale: 50 })
    vi.mocked(mockPrisma.righeVendita.create).mockResolvedValue({})
    vi.mocked(mockPrisma.prodotti.findUnique).mockResolvedValue({ id: 1, tipo: 'prodotto', unitaMisura: 'kg' })
    vi.mocked(mockPrisma.movimentiInput.create).mockResolvedValue({})
    vi.mocked(mockPrisma.vendite.findUnique).mockResolvedValue({
      id: 1, data: '2024-06-15', importoTotale: 50,
      righe: [{ prodottoId: 1, quantita: 5, prezzoUnitario: 10, importo: 50 }],
    })
  })

  it('crea vendita con successo', async () => {
    const req = mockRequest(validBody)
    const res = await POST(req)
    const data = await res.json()

    expect(res.status).toBe(201)
    expect(data.importoTotale).toBe(50)
  })

  it('calcola importoTotale dalla somma righe', async () => {
    const body = {
      ...validBody,
      righe: [
        { prodottoId: 1, formato: 'kg', quantita: 3, prezzoUnitario: 10 },
        { prodottoId: 2, formato: 'pezzi', quantita: 2, prezzoUnitario: 20 },
      ],
    }
    const req = mockRequest(body)
    await POST(req)

    expect(mockPrisma.vendite.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ importoTotale: 70 }) })
    )
  })

  it('scarica il magazzino per prodotti finiti', async () => {
    const req = mockRequest(validBody)
    await POST(req)

    expect(mockPrisma.movimentiInput.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tipo: 'vendita', quantita: 5, prodottoId: 1 }),
      })
    )
  })

  it('rifiuta richiesta senza righe', async () => {
    const req = mockRequest({ data: '2024-06-15', tipoCliente: 'Privato', righe: [] })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('rifiuta richiesta senza tipoCliente', async () => {
    const req = mockRequest({ data: '2024-06-15', righe: [{ prodottoId: 1, quantita: 1, prezzoUnitario: 10 }] })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
