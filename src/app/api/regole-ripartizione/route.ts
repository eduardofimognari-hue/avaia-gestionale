import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { regoleRipartizioneSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const data = await prisma.regoleRipartizione.findMany({
      where: { attivo: true, aziendaId },
      include: {
        luogoSorgente: { select: { id: true, nome: true } },
        luogoDestinazione: { select: { id: true, nome: true } },
      },
      orderBy: { anno: 'desc' },
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero regole ripartizione' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = regoleRipartizioneSchema.parse(body)

    const regola = await prisma.regoleRipartizione.create({
      data: {
        luogoSorgenteId: parsed.luogoSorgenteId,
        luogoDestinazioneId: parsed.luogoDestinazioneId,
        percentuale: parsed.percentuale,
        anno: parsed.anno,
        aziendaId,
      },
      include: {
        luogoSorgente: { select: { id: true, nome: true } },
        luogoDestinazione: { select: { id: true, nome: true } },
      },
    })

    return NextResponse.json(regola, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione regola ripartizione' }, { status: 500 })
  }
}
