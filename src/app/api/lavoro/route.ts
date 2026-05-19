import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { lavoroSociSchema } from '@/lib/validations'
import { ZodError } from 'zod'

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
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = lavoroSociSchema.parse(body)

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
        areaId: parsed.areaId ?? null,
        luogoId: parsed.luogoId ?? null,
        ore: parsed.ore, costoOrario,
        descrizione: parsed.descrizione ?? null,
      },
      include: { socio: true, area: true, luogo: true },
    })

    return NextResponse.json(lavoro, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione del lavoro' }, { status: 500 })
  }
}
