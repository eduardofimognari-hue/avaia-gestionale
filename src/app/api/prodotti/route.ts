import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { prodottiSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const prodotti = await prisma.prodotti.findMany({
      where: { attivo: true, aziendaId },
      orderBy: { nome: 'asc' },
    })
    return NextResponse.json(prodotti)
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero dei prodotti' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = prodottiSchema.parse(body)

    const maxId = await prisma.prodotti.aggregate({ _max: { id: true } })
    const nextId = (maxId._max.id ?? 0) + 1
    const codice = `PROD-${nextId.toString().padStart(4, '0')}`

    const prodotto = await prisma.prodotti.create({
      data: {
        codice, nome: parsed.nome, aziendaId,
        varietaTipologia: parsed.varietaTipologia ?? null,
        categoria: parsed.categoria ?? null,
        tipo: parsed.tipo ?? 'prodotto',
        unitaMisura: parsed.unitaMisura ?? 'kg',
        note: parsed.note ?? null,
      },
    })

    return NextResponse.json(prodotto, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione del prodotto' }, { status: 500 })
  }
}
