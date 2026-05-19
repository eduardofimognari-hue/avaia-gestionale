import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { movimentiSociSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const data = await prisma.movimentiSoci.findMany({
      where: { aziendaId },
      orderBy: { data: 'desc' },
      include: { socio: true, liquidazione: { select: { id: true, importoNetto: true, stato: true } } },
    })
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero movimenti soci' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = movimentiSociSchema.parse(body)

    const movimento = await prisma.movimentiSoci.create({
      data: {
        data: parsed.data ? new Date(parsed.data) : new Date(), socioId: parsed.socioId,
        tipo: parsed.tipo, importo: parsed.importo, aziendaId,
        categoria: parsed.categoria ?? null,
        descrizione: parsed.descrizione ?? null,
      },
      include: { socio: true },
    })

    return NextResponse.json(movimento, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione movimento socio' }, { status: 500 })
  }
}
