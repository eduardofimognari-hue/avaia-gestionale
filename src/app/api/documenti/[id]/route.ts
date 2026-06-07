import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withAzienda, withRuoloScrittura } from '@/lib/api-utils'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  return withAzienda(async (aziendaId) => {
    const doc = await prisma.documenti.findFirst({
      where: { id, aziendaId },
      include: {
        vendita: {
          include: {
            cliente: true,
            righe: { include: { prodotto: true } },
          },
        },
        cliente: true,
      },
    })
    if (!doc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 })
    return NextResponse.json(doc)
  })
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const id = parseInt(params.id)
  if (!id) return NextResponse.json({ error: 'ID non valido' }, { status: 400 })
  return withAzienda(async (aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!

    const doc = await prisma.documenti.findFirst({ where: { id, aziendaId }, include: { vendita: true, cliente: true } })
    if (!doc) return NextResponse.json({ error: 'Documento non trovato' }, { status: 404 })

    const body = await request.json()

    if (body.azione === 'conferma' && doc.tipo === 'ddt') {
      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.documenti.update({
          where: { id },
          data: { stato: 'emesso' },
        })

        const anno = new Date().getFullYear()
        const ultima = await tx.documenti.findFirst({
          where: { aziendaId, tipo: 'fattura', anno },
          orderBy: { numero: 'desc' },
          select: { numero: true },
        })
        const numero = (ultima?.numero ?? 0) + 1

        const fattura = await tx.documenti.create({
          data: {
            tipo: 'fattura', numero, anno,
            data: new Date(),
            venditaId: doc.venditaId,
            clienteId: doc.clienteId,
            importoTotale: doc.importoTotale,
            stato: 'emesso',
            note: `Generata automaticamente da DDT #${doc.numero}/${doc.anno}`,
            aziendaId,
          },
        })

        if (doc.venditaId) {
          await tx.vendite.update({
            where: { id: doc.venditaId },
            data: { statoFattura: 'fatturato' },
          })
        }

        if (doc.clienteId) {
          await tx.debitiAperti.create({
            data: {
              data: new Date(),
              clienteId: doc.clienteId,
              importo: doc.importoTotale,
              descrizione: `Fattura #${fattura.numero}/${fattura.anno} (da DDT #${doc.numero}/${doc.anno})`,
              scadenza: null,
              stato: 'aperto',
              venditaId: doc.venditaId ?? null,
              tipo: 'cliente',
              aziendaId,
            },
          })
        }

        return { ddt: updated, fattura }
      })

      return NextResponse.json(result)
    }

    if (body.azione === 'emetti_fattura' && doc.tipo === 'ddt') {
      const fattura = await prisma.$transaction(async (tx) => {
        const anno = new Date().getFullYear()
        const ultima = await tx.documenti.findFirst({
          where: { aziendaId, tipo: 'fattura', anno },
          orderBy: { numero: 'desc' },
          select: { numero: true },
        })
        const numero = (ultima?.numero ?? 0) + 1

        const nuovaFattura = await tx.documenti.create({
          data: {
            tipo: 'fattura', numero, anno,
            data: new Date(),
            venditaId: doc.venditaId,
            clienteId: doc.clienteId,
            importoTotale: doc.importoTotale,
            stato: 'emesso',
            dataPagamentoPrevista: body.dataPagamentoPrevista ? new Date(body.dataPagamentoPrevista) : null,
            metodoPagamento: body.metodoPagamento ?? null,
            note: `Generata da DDT #${doc.numero}/${doc.anno}`,
            aziendaId,
          },
        })

        if (doc.venditaId) {
          await tx.vendite.update({
            where: { id: doc.venditaId },
            data: { statoFattura: 'fatturato' },
          })
        }

        const isPagataImmediatamente = !body.dataPagamentoPrevista || new Date(body.dataPagamentoPrevista) <= new Date()
        if (isPagataImmediatamente) {
          const primaCassa = await tx.casseInterne.findFirst({ where: { aziendaId }, orderBy: { id: 'asc' } })
          if (primaCassa) {
            await tx.movimentiCassa.create({
              data: {
                data: new Date(), cassaId: primaCassa.id, aziendaId,
                tipo: 'entrata',
                tipoMovimento: 'incasso_cliente',
                importo: doc.importoTotale,
                categoria: 'Fattura',
                descrizione: `Fattura #${nuovaFattura.numero}/${nuovaFattura.anno} - ${doc.cliente?.nome || ''} ${doc.cliente?.cognome || ''}`,
                riferimento: `Fattura #${nuovaFattura.id}`,
                riferimentoId: nuovaFattura.id,
                riferimentoTipo: 'fattura',
                stato: 'pagato',
              },
            })
            if (doc.venditaId) {
              await tx.vendite.update({ where: { id: doc.venditaId }, data: { pagata: true, statoPagamento: 'pagato' } })
            }
          }
        } else if (doc.clienteId) {
          await tx.debitiAperti.create({
            data: {
              data: new Date(),
              clienteId: doc.clienteId,
              importo: doc.importoTotale,
              descrizione: `Fattura #${nuovaFattura.numero}/${nuovaFattura.anno}`,
              scadenza: new Date(body.dataPagamentoPrevista),
              stato: 'aperto',
              venditaId: doc.venditaId ?? null,
              tipo: 'cliente',
              aziendaId,
            },
          })
        }

        return nuovaFattura
      })

      return NextResponse.json(fattura, { status: 201 })
    }

    if (body.azione === 'paga' && doc.tipo === 'fattura') {
      if (doc.stato === 'completato') {
        return NextResponse.json({ error: 'Fattura già pagata' }, { status: 400 })
      }
      const dataPagamento = body.dataPagamento ? new Date(body.dataPagamento) : new Date()
      const updated = await prisma.$transaction(async (tx) => {
        const result = await tx.documenti.update({
          where: { id },
          data: { stato: 'completato', dataPagamento, metodoPagamento: body.metodoPagamento ?? doc.metodoPagamento },
        })

        const primaCassa = await tx.casseInterne.findFirst({ where: { aziendaId }, orderBy: { id: 'asc' } })
        if (primaCassa) {
          await tx.movimentiCassa.create({
            data: {
              data: dataPagamento,
              cassaId: primaCassa.id,
              aziendaId,
              tipo: 'entrata',
              tipoMovimento: 'incasso_cliente',
              importo: doc.importoTotale,
              categoria: 'Fattura',
              descrizione: `Pagamento fattura #${doc.numero}/${doc.anno} - ${doc.cliente?.nome || ''} ${doc.cliente?.cognome || ''}`,
              riferimento: `Fattura #${doc.id}`,
              riferimentoId: doc.id,
              riferimentoTipo: 'fattura',
              stato: 'pagato',
            },
          })
        }

        if (doc.venditaId) {
          await tx.vendite.update({ where: { id: doc.venditaId }, data: { pagata: true, statoPagamento: 'pagato' } })
          await tx.debitiAperti.updateMany({
            where: { venditaId: doc.venditaId, stato: 'aperto' },
            data: { stato: 'chiuso', dataSaldo: dataPagamento },
          })
        }

        return result
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
  })
}