import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { debitiSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const debiti = await prisma.debitiAperti.findMany({
      where: { aziendaId },
      orderBy: { data: 'desc' },
      include: { cliente: true, vendita: { select: { id: true, importoTotale: true, nota: true } } },
    })
    return NextResponse.json(debiti)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei debiti' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = debitiSchema.parse(body)

    const debito = await prisma.debitiAperti.create({
      data: {
        data: parsed.data ? new Date(parsed.data) : new Date(), aziendaId,
        clienteId: parsed.clienteId ?? null,
        importo: parsed.importo,
        descrizione: parsed.descrizione ?? null,
        scadenza: parsed.scadenza ? new Date(parsed.scadenza) : null,
        venditaId: parsed.venditaId ?? null,
        note: parsed.note ?? null,
      },
      include: { cliente: true, vendita: { select: { id: true, importoTotale: true } } },
    })

    return NextResponse.json(debito, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione del debito' }, { status: 500 })
  }
}
