import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const body = await request.json()
    const vendita = await prisma.vendite.findFirst({ where: { id, aziendaId } })
    if (!vendita) return NextResponse.json({ error: 'Vendita non trovata' }, { status: 404 })

    const wasPagata = vendita.pagata
    const isPagata = body.pagata === true

    const updated = await prisma.vendite.update({
      where: { id },
      data: {
        pagata: body.pagata ?? undefined,
        statoPagamento: body.statoPagamento ?? undefined,
        metodoPagamento: body.metodoPagamento ?? undefined,
        dataPagamentoPrevista: body.dataPagamentoPrevista ? new Date(body.dataPagamentoPrevista) : undefined,
      },
    })

    // If newly marked as paid, create movimento in contabilità
    if (isPagata && !wasPagata) {
      const primaCassa = await prisma.casseInterne.findFirst({ where: { aziendaId }, orderBy: { id: 'asc' } })
      if (primaCassa) {
        await prisma.movimentiCassa.create({
          data: {
            data: new Date(),
            cassaId: primaCassa.id,
            aziendaId,
            tipo: 'entrata',
            tipoMovimento: 'incasso_cliente',
            importo: Number(vendita.importoTotale || 0),
            categoria: 'Vendite',
            descrizione: `Pagamento vendita #${vendita.id} - ${vendita.tipoCliente}`,
            riferimento: `Vendita #${vendita.id}`,
            riferimentoId: vendita.id,
            riferimentoTipo: 'vendita',
            stato: 'pagato',
          },
        })
        // Close open debit
        await prisma.debitiAperti.updateMany({
          where: { venditaId: id, stato: 'aperto' },
          data: { stato: 'chiuso', dataSaldo: new Date() },
        })
      }
    }

    return NextResponse.json(updated)
  })
}