import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'
import { venditaNuovaSchema } from '@/lib/validations'
import { ZodError } from 'zod'

export async function POST(request: Request) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const body = await request.json()
    const parsed = venditaNuovaSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      const importoTotale = parsed.righe.reduce((sum: number, r: { quantita: number; prezzoUnitario: number }) => {
        return sum + r.quantita * r.prezzoUnitario
      }, 0)

      const vendita = await tx.vendite.create({
        data: {
          data: new Date(parsed.data), aziendaId,
          clienteId: parsed.clienteId ?? null,
          tipoCliente: parsed.tipoCliente,
          importoTotale,
        },
      })

      for (const r of parsed.righe) {
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
              data: new Date(parsed.data), aziendaId,
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
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors.map(e => e.message).join(', ') }, { status: 400 })
    }
    return NextResponse.json({ error: 'Errore nella creazione della vendita' }, { status: 500 })
  }
}
