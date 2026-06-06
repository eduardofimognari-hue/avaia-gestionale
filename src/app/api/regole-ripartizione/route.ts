import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { regoleRipartizioneSchema } from '@/lib/validations'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const data = await prisma.regoleRipartizione.findMany({
      where: { attivo: true, aziendaId },
      include: {
        luogoSorgente: { select: { id: true, nome: true } },
        luogoDestinazione: { select: { id: true, nome: true } },
      },
      orderBy: { anno: 'desc' },
    })
    return NextResponse.json(data)
  })
}

export async function POST(request: Request) {
  return withValidazione(request, regoleRipartizioneSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const regola = await prisma.regoleRipartizione.create({
      data: {
        luogoSorgenteId: parsed.luogoSorgenteId, luogoDestinazioneId: parsed.luogoDestinazioneId,
        percentuale: parsed.percentuale, anno: parsed.anno, aziendaId,
      },
      include: {
        luogoSorgente: { select: { id: true, nome: true } },
        luogoDestinazione: { select: { id: true, nome: true } },
      },
    })
    return NextResponse.json(regola, { status: 201 })
  })
}
