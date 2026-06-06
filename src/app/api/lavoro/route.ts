import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { lavoroSociSchema } from '@/lib/validations'

export async function GET() {
  return withAzienda(async (aziendaId) => {
    const lavori = await prisma.lavoroSoci.findMany({
      where: { aziendaId },
      orderBy: { data: 'desc' },
      include: { socio: true, area: true, luogo: true },
    })
    return NextResponse.json(lavori)
  })
}

export async function POST(request: Request) {
  return withValidazione(request, lavoroSociSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    let costoOrario = 10
    if (parsed.areaId) {
      const tariffa = await prisma.tariffeLavoro.findFirst({
        where: { socioId: parsed.socioId, areaId: parsed.areaId, anno: new Date().getFullYear(), attivo: true },
      })
      if (tariffa) costoOrario = tariffa.costoOrario
    }
    const lavoro = await prisma.lavoroSoci.create({
      data: {
        data: new Date(parsed.data), socioId: parsed.socioId, aziendaId,
        areaId: parsed.areaId ?? null, luogoId: parsed.luogoId ?? null,
        ore: parsed.ore, costoOrario, descrizione: parsed.descrizione ?? null,
      },
      include: { socio: true, area: true, luogo: true },
    })
    return NextResponse.json(lavoro, { status: 201 })
  })
}
