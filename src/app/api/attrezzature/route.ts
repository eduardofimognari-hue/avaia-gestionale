import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'
import { z } from 'zod'

const attrezzaturaSchema = z.object({
  nome: z.string().min(1),
  categoria: z.string().optional().nullable(),
  fornitoreId: z.number().optional().nullable(),
  costoUnitario: z.number().optional().nullable(),
  unitaMisura: z.string().optional().default('pezzi'),
  scortaMinima: z.number().optional().nullable(),
  quantita: z.number().optional().default(0),
  note: z.string().optional().nullable(),
  attivo: z.boolean().optional(),
})

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const items = await prisma.attrezzature.findMany({
      where: { attivo: true, aziendaId },
      include: { fornitore: { select: { id: true, nome: true, cognome: true, ragioneSociale: true } } },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(items)
  })
}

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = attrezzaturaSchema.parse(body)
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const item = await prisma.attrezzature.create({ data: { ...parsed, aziendaId } })
    return NextResponse.json(item, { status: 201 })
  })
}