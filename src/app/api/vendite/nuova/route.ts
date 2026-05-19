import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const body = await request.json()
    const { data, clienteId, tipoCliente, righe } = body

    if (!data || !tipoCliente || !righe || !Array.isArray(righe) || righe.length === 0) {
      return NextResponse.json({ error: 'Campi obbligatori mancanti: data, tipoCliente, righe (array non vuoto)' }, { status: 400 })
    }

    const result = await prisma.$transaction(async (tx) => {
      const importoTotale = righe.reduce((sum: number, r: { quantita: number; prezzoUnitario: number }) => {
        return sum + r.quantita * r.prezzoUnitario
      }, 0)

      const vendita = await tx.vendite.create({
        data: {
          data: new Date(data), aziendaId,
          clienteId: clienteId ?? null,
          tipoCliente,
          importoTotale,
        },
      })

      for (const r of righe) {
        await tx.righeVendita.create({
          data: {
            venditaId: vendita.id,
            prodottoId: r.prodottoId,
            formato: r.formato ?? null,
            quantita: r.quantita,
            prezzoUnitario: r.prezzoUnitario,
            importo: r.quantita * r.prezzoUnitario,
          },
        })
        const prod = await tx.prodotti.findUnique({ where: { id: r.prodottoId } })
        if (prod && prod.tipo === 'prodotto') {
          await tx.movimentiInput.create({
            data: {
              data: new Date(data), aziendaId,
              prodottoId: r.prodottoId,
              tipo: 'vendita',
              quantita: r.quantita,
              unitaMisura: r.formato?.includes('vasetto') ? 'vasetti' : prod.unitaMisura,
              note: `Vendita #${vendita.id} - ${r.formato || ''}`,
            },
          })
        }
      }

      return tx.vendite.findUnique({
        where: { id: vendita.id },
        include: { righe: true },
      })
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Errore nella creazione della vendita' }, { status: 500 })
  }
}
