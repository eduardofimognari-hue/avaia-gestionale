import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const liquidazioneId = parseInt(params.id)
  if (!liquidazioneId) return NextResponse.json({ error: 'ID liquidazione non valido' }, { status: 400 })

  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!

    const liquidazione = await prisma.liquidazioniSoci.findFirst({
      where: { id: liquidazioneId, aziendaId },
      include: { socio: true, cliente: true },
    })
    if (!liquidazione) return NextResponse.json({ error: 'Liquidazione non trovata' }, { status: 404 })
    if (liquidazione.stato === 'pagato') return NextResponse.json({ error: 'Liquidazione già pagata' }, { status: 400 })

    const body = await request.json()

    if (body.azione === 'paga' && liquidazione.importoNetto !== 0) {
      const primaCassa = await prisma.casseInterne.findFirst({ where: { aziendaId }, orderBy: { id: 'asc' } })
      if (!primaCassa) return NextResponse.json({ error: 'Nessuna cassa configurata' }, { status: 400 })

      const isEntrata = liquidazione.importoNetto < 0
      const nomeSoggetto = liquidazione.socio
        ? `${liquidazione.socio.nome} ${liquidazione.socio.cognome}`
        : liquidazione.cliente
          ? `${liquidazione.cliente.nome} ${liquidazione.cliente.cognome || ''}`
          : 'N/A'

      const dataPagamento = new Date()

      let alreadyPaid = false
      await prisma.$transaction(async (tx) => {
        // Ricontrollo atomico dello stato dentro la transaction per evitare doppio pagamento
        const liqCheck = await tx.liquidazioniSoci.findFirst({ where: { id: liquidazioneId, aziendaId, stato: { not: 'pagato' } } })
        if (!liqCheck) { alreadyPaid = true; return }

        const movimentoCassa = await tx.movimentiCassa.create({
          data: {
            data: dataPagamento, cassaId: primaCassa.id, aziendaId,
            socioId: liquidazione.socioId ?? null,
            tipo: isEntrata ? 'entrata' : 'uscita',
            tipoMovimento: 'liquidazione',
            importo: Math.abs(liquidazione.importoNetto),
            categoria: 'Liquidazione',
            descrizione: `Liquidazione #${liquidazioneId} - ${nomeSoggetto} (${isEntrata ? 'incasso' : 'pagamento'})`,
            riferimento: `Liquidazione #${liquidazioneId}`,
          },
        })

        if (liquidazione.tipo === 'interna' && liquidazione.socioId) {
          const isRimborsoSocio = liquidazione.importoNetto > 0
          const daLiquidare = await tx.movimentiSoci.findMany({
            where: {
              aziendaId, socioId: liquidazione.socioId, liquidato: false,
              tipo: isRimborsoSocio ? 'credito' : 'debito',
            },
            orderBy: { data: 'asc' },
          })
          let daCoprire = Math.abs(liquidazione.importoNetto)
          for (const m of daLiquidare) {
            if (daCoprire <= 0) break
            // Marca come liquidato solo i movimenti completamente coperti dall'importo
            if (m.importo <= daCoprire) {
              await tx.movimentiSoci.update({ where: { id: m.id }, data: { liquidato: true, liquidazioneId } })
              daCoprire -= m.importo
            }
          }
        }

        if (liquidazione.tipo === 'esterna' && liquidazione.clienteId) {
          const debitiAperti = await tx.debitiAperti.findMany({
            where: { aziendaId, clienteId: liquidazione.clienteId, stato: 'aperto' },
            orderBy: { data: 'asc' },
          })
          let daCoprire = Math.abs(liquidazione.importoNetto)
          for (const d of debitiAperti) {
            if (daCoprire <= 0) break
            const saldoParziale = Math.min(daCoprire, Number(d.importo))
            await tx.debitiAperti.update({
              where: { id: d.id },
              data: { stato: 'chiuso', dataSaldo: dataPagamento },
            })
            daCoprire -= saldoParziale
          }
        }

        await tx.liquidazioniSoci.update({
          where: { id: liquidazioneId },
          data: { stato: 'pagato', dataPagamento, movimentoCassaId: movimentoCassa.id },
        })
      })
      if (alreadyPaid) return NextResponse.json({ error: 'Liquidazione già pagata' }, { status: 400 })

      return NextResponse.json(
        await prisma.liquidazioniSoci.findUnique({
          where: { id: liquidazioneId },
          include: {
            socio: { select: { id: true, nome: true, cognome: true } },
            cliente: { select: { id: true, nome: true, cognome: true } },
            movimenti: { select: { id: true, tipo: true, importo: true, categoria: true, descrizione: true } },
            movimentoCassa: { select: { id: true, importo: true, tipo: true, data: true } },
          },
        })
      )
    }

    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
  })
}