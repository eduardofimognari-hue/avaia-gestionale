import { vi } from 'vitest'

const mockPrisma = {
  utente: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  azienda: { findUnique: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
  soci: { findMany: vi.fn(), create: vi.fn() },
  clienti: { findMany: vi.fn(), create: vi.fn() },
  prodotti: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
  aree: { findMany: vi.fn(), create: vi.fn() },
  luoghi: { findMany: vi.fn(), create: vi.fn() },
  ruoli: { findMany: vi.fn() },
  listinoPrezzi: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
  movimentiInput: { findMany: vi.fn(), create: vi.fn(), groupBy: vi.fn(), aggregate: vi.fn() },
  movimentiCassa: { findMany: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
  casseInterne: { findMany: vi.fn(), create: vi.fn() },
  lavoroSoci: { findMany: vi.fn(), create: vi.fn() },
  movimentiSoci: { findMany: vi.fn(), create: vi.fn(), updateMany: vi.fn() },
  liquidazioniSoci: { findMany: vi.fn(), create: vi.fn() },
  debitiAperti: { findMany: vi.fn(), create: vi.fn() },
  regoleRipartizione: { findMany: vi.fn(), create: vi.fn() },
  vendite: { findMany: vi.fn(), findUnique: vi.fn(), create: vi.fn(), aggregate: vi.fn() },
  righeVendita: { findMany: vi.fn(), create: vi.fn() },
  tariffeLavoro: { findFirst: vi.fn(), findMany: vi.fn() },
  $transaction: vi.fn(),
}

mockPrisma.$transaction.mockImplementation((fn: any) => fn(mockPrisma))

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }))

vi.mock('@/lib/auth', async () => {
  const actual = await vi.importActual('@/lib/auth')
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    requireRole: vi.fn().mockResolvedValue({ allowed: true, response: null, utente: { id: 1, email: 'admin@test.it', nome: 'Admin', ruolo: 'admin', attivo: true, aziendaId: 1 } }),
  }
})

vi.mock('@/lib/azienda-context', async () => {
  const actual = await vi.importActual('@/lib/azienda-context')
  return {
    ...actual,
    getCurrentAziendaId: vi.fn().mockResolvedValue(1),
  }
})

export { mockPrisma }
