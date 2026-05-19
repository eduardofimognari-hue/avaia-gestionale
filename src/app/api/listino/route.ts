import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { listinoSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const listino = await prisma.listinoPrezzi.findMany({
      where: { aziendaId },
      orderBy: { anno: 'desc' },
      include: { prodotto: true },
    })
    return NextResponse.json(listino)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero del listino' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = listinoSchema.parse(body)

    const entry = await prisma.listinoPrezzi.create({
      data: {
        anno: parsed.anno, prodottoId: parsed.prodottoId, tipoCliente: parsed.tipoCliente,
        formato: parsed.formato, unitaMisura: parsed.unitaMisura, prezzoBase: parsed.prezzoBase, aziendaId,
        dataInizio: parsed.dataInizio ? new Date(parsed.dataInizio) : null,
        dataFine: parsed.dataFine ? new Date(parsed.dataFine) : null,
        note: parsed.note ?? null,
      },
      include: { prodotto: true },
    })

    return NextResponse.json(entry, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione del listino' }, { status: 500 })
  }
}
