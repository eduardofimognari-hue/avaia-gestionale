import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { luoghiSchema } from '@/lib/validations'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const luoghi = await prisma.luoghi.findMany({ where: { attivo: true, aziendaId }, orderBy: { nome: 'asc' } })
    return NextResponse.json(luoghi)
  })
}

export async function POST(request: Request) {
  return withValidazione(request, luoghiSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const luogo = await prisma.luoghi.create({
      data: {
        nome: parsed.nome, aziendaId,
        indirizzo: parsed.indirizzo || null,
        comune: parsed.comune || null,
        provincia: parsed.provincia || null,
        cap: parsed.cap || null,
        tipologia: parsed.tipologia || 'reale',
        categoria: parsed.categoria || 'produttivo',
        usoAziendale: parsed.usoAziendale ?? true,
        note: parsed.note || null,
      },
    })
    return NextResponse.json(luogo, { status: 201 })
  })
}
