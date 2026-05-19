import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { contabilitaMovimentoSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function GET() {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })

    const [casse, luoghi, movimenti, soci, movimentiSoci] = await Promise.all([
      prisma.casseInterne.findMany({
        where: { aziendaId },
        include: { movimenti: { select: { tipo: true, importo: true, luogoId: true } } },
      }),
      prisma.luoghi.findMany({ where: { aziendaId, attivo: true } }),
      prisma.movimentiCassa.findMany({
        where: { aziendaId },
        include: {
          cassa: { select: { nome: true } },
          luogo: { select: { id: true, nome: true, tipo: true } },
          socio: { select: { id: true, nome: true, cognome: true } },
        },
        orderBy: { data: 'desc' },
        take: 100,
      }),
      prisma.soci.findMany({ where: { aziendaId, attivo: true }, select: { id: true, nome: true, cognome: true } }),
      prisma.movimentiSoci.findMany({
        where: { aziendaId },
        include: { socio: { select: { id: true, nome: true, cognome: true } } },
        orderBy: { data: 'desc' },
        take: 50,
      }),
    ])

    return NextResponse.json({ casse, luoghi, movimenti, soci, movimentiSoci })
  } catch (error) {
    return NextResponse.json({ error: 'Errore nel recupero dati contabilità' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = contabilitaMovimentoSchema.parse(body)

    const movimento = await prisma.movimentiCassa.create({
      data: {
        data: parsed.data ? new Date(parsed.data) : new Date(),
        cassaId: parsed.cassaId,
        aziendaId,
        luogoId: parsed.luogoId ?? null,
        socioId: parsed.socioId ?? null,
        tipo: parsed.tipo,
        tipoMovimento: parsed.tipoMovimento ?? 'altro',
        importo: parsed.importo,
        categoria: parsed.categoria ?? null,
        descrizione: parsed.descrizione ?? null,
        riferimento: parsed.riferimento ?? null,
      },
      include: {
        cassa: { select: { nome: true } },
        luogo: { select: { id: true, nome: true, tipo: true } },
        socio: { select: { id: true, nome: true, cognome: true } },
      },
    })

    return NextResponse.json(movimento, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione movimento' }, { status: 500 })
  }
}
