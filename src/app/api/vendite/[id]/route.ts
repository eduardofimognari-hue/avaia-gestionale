import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { venditePatchSchema } from '@/lib/validations'
import { STATO_DEBITO, TIPO_MOVIMENTO_CASSA } from '@/lib/constants'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  return withValidazione(request, venditePatchSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!
    const vendita = await prisma.vendite.findFirst({ where: { id, aziendaId } })
    if (!vendita) return NextResponse.json({ error: 'Vendita non trovata' }, { status: 404 })

    const wasPagata = vendita.pagata
    const isPagata = parsed.pagata === true

    const updated = await prisma.vendite.update({
      where: { id },
      data: {
        pagata: parsed.pagata ?? undefined,
        statoPagamento: parsed.statoPagamento ?? undefined,
        metodoPagamento: parsed.metodoPagamento ?? undefined,
        dataPagamentoPrevista: parsed.dataPagamentoPrevista ? new Date(parsed.dataPagamentoPrevista) : undefined,
      },
    })

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
          data: { stato: STATO_DEBITO.CHIUSO, dataSaldo: new Date() },
        })
      }
    }

    return NextResponse.json(updated)
  })
}