import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const lavori = await prisma.lavoroSoci.findMany({
      where: { aziendaId },
      orderBy: { data: 'desc' },
      include: { socio: true, area: true, luogo: true },
    })
    return NextResponse.json(lavori)
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero dei lavori' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await request.json()
    const { data, socioId, areaId, luogoId, ore, descrizione } = body

    if (!data || !socioId || ore === undefined) {
      return NextResponse.json({ error: 'Campi obbligatori: data, socioId, ore' }, { status: 400 })
    }

    let costoOrario = 10
    if (areaId) {
      const tariffa = await prisma.tariffeLavoro.findFirst({
        where: { socioId, areaId, anno: new Date().getFullYear(), attivo: true },
      })
      if (tariffa) costoOrario = tariffa.costoOrario
    }

    const lavoro = await prisma.lavoroSoci.create({
      data: {
        data: new Date(data), socioId, aziendaId,
        areaId: areaId ?? null,
        luogoId: luogoId ?? null,
        ore, costoOrario,
        descrizione: descrizione ?? null,
      },
      include: { socio: true, area: true, luogo: true },
    })

    return NextResponse.json(lavoro, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Errore nella creazione del lavoro' }, { status: 500 })
  }
}
