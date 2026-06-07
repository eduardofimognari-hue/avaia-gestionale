import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { z } from 'zod'

const schema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
})

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const items = await prisma.portaInnesti.findMany({
      where: { aziendaId },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(items)
  })
}

export async function POST(request: Request) {
  return withValidazione(request, schema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const item = await prisma.portaInnesti.create({
      data: { nome: parsed.nome, aziendaId },
    })
    return NextResponse.json(item, { status: 201 })
  })
}
