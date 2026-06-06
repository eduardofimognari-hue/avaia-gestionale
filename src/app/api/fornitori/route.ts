import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { z } from 'zod'

const fornitoreSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
  cognome: z.string().optional().nullable(),
  ragioneSociale: z.string().optional().nullable(),
  partitaIva: z.string().optional().nullable(),
  codiceFiscale: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  indirizzo: z.string().optional().nullable(),
  comune: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  cap: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const fornitori = await prisma.fornitori.findMany({
      where: { aziendaId, attivo: true },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(fornitori)
  })
}

export async function POST(request: Request) {
  return withValidazione(request, fornitoreSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const fornitore = await prisma.fornitori.create({ data: { ...parsed, aziendaId } })
    return NextResponse.json(fornitore, { status: 201 })
  })
}