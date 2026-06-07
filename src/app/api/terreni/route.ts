import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { z } from 'zod'

const terrenoSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
  superficie: z.number().optional().nullable(),
  unitaMisura: z.string().optional().default('ha'),
  indirizzo: z.string().optional().nullable(),
  comune: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  cap: z.string().optional().nullable(),
  latitudine: z.number().optional().nullable(),
  longitudine: z.number().optional().nullable(),
  googleMapsUrl: z.string().optional().nullable(),
  confine: z.any().optional().nullable(),
  prodottiIds: z.any().optional().nullable(),
  luogoId: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
})

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const terreni = await prisma.terreni.findMany({
      where: { aziendaId, attivo: true },
      include: { luogo: { select: { id: true, nome: true } } },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(terreni)
  })
}

export async function POST(request: Request) {
  return withValidazione(request, terrenoSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const terreno = await prisma.terreni.create({ data: { ...parsed, aziendaId } })
    return NextResponse.json(terreno, { status: 201 })
  })
}