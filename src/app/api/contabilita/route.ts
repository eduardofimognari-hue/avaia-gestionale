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

    const [casse, luoghi, movimenti, soci, movimentiSoci, posizioniSoci, vendite, documenti] = await Promise.all([
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
      prisma.movimentiSoci.groupBy({
        by: ['socioId', 'tipo'],
        where: { aziendaId, liquidato: false },
        _sum: { importo: true },
      }),
      prisma.vendite.findMany({
        where: { aziendaId },
        select: { id: true, data: true, importoTotale: true, cliente: { select: { nome: true, cognome: true } } },
        orderBy: { data: 'desc' },
        take: 50,
      }),
      prisma.documenti.findMany({
        where: { aziendaId },
        select: { id: true, tipo: true, numero: true, anno: true, data: true, importoTotale: true },
        orderBy: { data: 'desc' },
        take: 50,
      }),
    ])

    const posizioniAperte = soci.map(s => {
      const crediti = posizioniSoci.find(p => p.socioId === s.id && p.tipo === 'credito')?._sum.importo ?? 0
      const debiti = posizioniSoci.find(p => p.socioId === s.id && p.tipo === 'debito')?._sum.importo ?? 0
      return { socioId: s.id, socio: s, crediti, debiti, netto: crediti - debiti }
    }).filter(p => p.netto !== 0)

    const riferimenti = [
      ...vendite.map(v => ({
        id: v.id, tipo: 'vendita',
        label: `Vendita #${v.id} - ${v.cliente ? `${v.cliente.nome} ${v.cliente.cognome ?? ''}` : 'N/A'} - ${v.importoTotale ? `€${v.importoTotale}` : ''}`,
        data: v.data,
      })),
      ...documenti.map(d => ({
        id: d.id, tipo: d.tipo,
        label: `${d.tipo.toUpperCase()} #${d.numero}/${d.anno} - €${d.importoTotale}`,
        data: d.data,
      })),
    ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

    const primaCassa = casse[0]

    return NextResponse.json({
      casse, luoghi, movimenti, soci, movimentiSoci, posizioniAperte, riferimenti,
      cassaUnica: primaCassa ? { id: primaCassa.id, nome: primaCassa.nome } : null,
    })
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

    // Se cassaId non fornito, usa la prima cassa disponibile
    let cassaId = parsed.cassaId
    if (!cassaId) {
      const primaCassa = await prisma.casseInterne.findFirst({ where: { aziendaId }, orderBy: { id: 'asc' } })
      if (!primaCassa) return NextResponse.json({ error: 'Nessuna cassa configurata' }, { status: 400 })
      cassaId = primaCassa.id
    }

    const movimento = await prisma.movimentiCassa.create({
      data: {
        data: parsed.data ? new Date(parsed.data) : new Date(),
        cassaId,
        aziendaId,
        luogoId: parsed.luogoId ?? null,
        socioId: parsed.socioId ?? null,
        tipo: parsed.tipo,
        tipoMovimento: parsed.tipoMovimento ?? 'altro',
        importo: parsed.importo,
        categoria: parsed.categoria ?? null,
        descrizione: parsed.descrizione ?? null,
        riferimento: parsed.riferimento ?? null,
        riferimentoId: parsed.riferimentoId ?? null,
        riferimentoTipo: parsed.riferimentoTipo ?? null,
        stato: parsed.stato ?? 'pagato',
      },
      include: {
        cassa: { select: { nome: true } },
        luogo: { select: { id: true, nome: true, tipo: true } },
        socio: { select: { id: true, nome: true, cognome: true } },
      },
    })

    // Auto-generazione movimenti soci per anticipi
    if (parsed.socioId && parsed.tipoMovimento === 'anticipo_socio' && parsed.tipo === 'entrata') {
      await prisma.movimentiSoci.create({
        data: {
          data: movimento.data,
          socioId: parsed.socioId,
          aziendaId,
          tipo: 'credito',
          importo: parsed.importo,
          categoria: parsed.categoria ?? null,
          descrizione: parsed.descrizione ?? `Anticipo socio: ${parsed.descrizione ?? ''}`,
          movimentoCassaId: movimento.id,
        },
      })
    }

    if (parsed.socioId && parsed.tipoMovimento === 'anticipo_azienda' && parsed.tipo === 'uscita') {
      await prisma.movimentiSoci.create({
        data: {
          data: movimento.data,
          socioId: parsed.socioId,
          aziendaId,
          tipo: 'debito',
          importo: parsed.importo,
          categoria: parsed.categoria ?? null,
          descrizione: parsed.descrizione ?? `Anticipo azienda: ${parsed.descrizione ?? ''}`,
          movimentoCassaId: movimento.id,
        },
      })
    }

    return NextResponse.json(movimento, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione movimento' }, { status: 500 })
  }
}
