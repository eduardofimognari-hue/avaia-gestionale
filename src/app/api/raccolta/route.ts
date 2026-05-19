import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { raccoltaSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })

    const raccolte = await prisma.raccolta.findMany({
      where: { aziendaId },
      include: {
        prodotto: { select: { id: true, nome: true, varietaTipologia: true, unitaMisura: true } },
        luogo: { select: { id: true, nome: true } },
        socio: { select: { id: true, nome: true, cognome: true } },
      },
      orderBy: { data: 'desc' },
      take: 100,
    })

    const totali = await prisma.raccolta.groupBy({
      by: ['prodottoId'],
      where: { aziendaId },
      _sum: { quantita: true },
    })

    const prodottiIds = totali.map(t => t.prodottoId)
    const prodotti = prodottiIds.length > 0
      ? await prisma.prodotti.findMany({ where: { id: { in: prodottiIds } }, select: { id: true, nome: true, varietaTipologia: true, unitaMisura: true } })
      : []

    return NextResponse.json({ raccolte, totali, prodotti })
  } catch {
    return NextResponse.json({ error: 'Errore nel recupero raccolte' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = raccoltaSchema.parse(body)

    const raccolta = await prisma.$transaction(async (tx) => {
      const r = await tx.raccolta.create({
        data: {
          data: new Date(parsed.data),
          prodottoId: parsed.prodottoId,
          quantita: parsed.quantita,
          unitaMisura: parsed.unitaMisura ?? 'kg',
          luogoId: parsed.luogoId ?? null,
          socioId: parsed.socioId ?? null,
          note: parsed.note ?? null,
          aziendaId,
        },
        include: {
          prodotto: { select: { id: true, nome: true, varietaTipologia: true } },
          luogo: { select: { id: true, nome: true } },
          socio: { select: { id: true, nome: true, cognome: true } },
        },
      })

      await tx.movimentiInput.create({
        data: {
          data: new Date(parsed.data),
          prodottoId: parsed.prodottoId,
          tipo: 'carico',
          quantita: parsed.quantita,
          unitaMisura: parsed.unitaMisura ?? 'kg',
          note: `Raccolta: ${parsed.note || 'nessuna nota'}`,
          aziendaId,
        },
      })

      return r
    })

    return NextResponse.json(raccolta, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione raccolta' }, { status: 500 })
  }
}
