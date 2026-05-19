import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { magazzinoMovimentoSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const movimenti = await prisma.movimentiInput.findMany({
      where: { aziendaId },
      orderBy: { data: 'desc' },
      take: 100,
      include: { prodotto: true },
    })
    return NextResponse.json(movimenti)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei movimenti di magazzino' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = magazzinoMovimentoSchema.parse(body)

    const movimento = await prisma.movimentiInput.create({
      data: {
        data: new Date(parsed.data), prodottoId: parsed.prodottoId, tipo: parsed.tipo,
        quantita: parsed.quantita, unitaMisura: parsed.unitaMisura, aziendaId,
        note: parsed.note ?? null,
      },
      include: { prodotto: true },
    })

    return NextResponse.json(movimento, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione del movimento' }, { status: 500 })
  }
}
