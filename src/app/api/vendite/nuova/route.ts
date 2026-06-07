import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { withValidazione, withRuoloScrittura } from '@/lib/api-utils'
import { z } from 'zod'

const venditaNuovaSchema = z.object({
  data: z.string().min(1, 'Data obbligatoria'),
  clienteId: z.number().optional().nullable(),
  tipoCliente: z.string().min(1, 'Tipo cliente obbligatorio'),
  luogoId: z.number().optional().nullable(),
  terrenoId: z.number().optional().nullable(),
  statoFattura: z.string().optional().default('non_fatturato'),
  metodoPagamento: z.string().optional().nullable(),
  rateizzato: z.boolean().optional().default(false),
  numeroRate: z.number().optional().nullable(),
  dataPagamentoPrevista: z.string().optional().nullable(),
  righe: z.array(z.object({
    prodottoId: z.number(),
    formato: z.string().optional().nullable(),
    quantita: z.number().positive(),
    prezzoUnitario: z.number(),
  })).min(1, 'Almeno una riga richiesta'),
})

export async function POST(request: Request) {
  return withValidazione(request, venditaNuovaSchema, async (parsed, aziendaId) => {
    const ruolo = await withRuoloScrittura(aziendaId)
    if (!ruolo.allowed) return ruolo.response!

    const result = await prisma.$transaction(async (tx) => {
      const importoTotale = parsed.righe.reduce((sum, r) => sum + r.quantita * r.prezzoUnitario, 0)
      const pagata = parsed.metodoPagamento === 'contanti' || !parsed.dataPagamentoPrevista

      const vendita = await tx.vendite.create({
        data: {
          data: new Date(parsed.data), aziendaId,
          clienteId: parsed.clienteId ?? null,
          tipoCliente: parsed.tipoCliente,
          luogoId: parsed.luogoId ?? null,
          terrenoId: parsed.terrenoId ?? null,
          statoFattura: parsed.statoFattura ?? 'non_fatturato',
          metodoPagamento: parsed.metodoPagamento ?? null,
          rateizzato: parsed.rateizzato ?? false,
          numeroRate: parsed.numeroRate ?? null,
          pagata,
          dataPagamentoPrevista: parsed.dataPagamentoPrevista ? new Date(parsed.dataPagamentoPrevista) : null,
          statoPagamento: pagata ? 'pagato' : 'da_pagare',
          importoTotale,
        },
      })

      for (const r of parsed.righe) {
        await tx.righeVendita.create({
          data: {
            venditaId: vendita.id, prodottoId: r.prodottoId, formato: r.formato ?? null,
            quantita: r.quantita, prezzoUnitario: r.prezzoUnitario, importo: r.quantita * r.prezzoUnitario,
          },
        })
        const prod = await tx.prodotti.findUnique({ where: { id: r.prodottoId } })
        if (prod && prod.tipo === 'prodotto') {
          await tx.movimentiInput.create({
            data: {
              data: new Date(parsed.data), aziendaId, prodottoId: r.prodottoId,
              tipo: 'vendita', quantita: r.quantita,
              unitaMisura: r.formato?.includes('vasetto') ? 'vasetti' : prod.unitaMisura,
              note: `Vendita #${vendita.id} - ${r.formato || ''}`,
            },
          })
        }
      }

      // If stato fattura is set, auto-generate document
      if (parsed.statoFattura !== 'non_fatturato') {
        const anno = new Date(parsed.data).getFullYear()
        const tipoDoc = parsed.statoFattura === 'ddt' ? 'ddt' : 'fattura'
        const ultimo = await tx.documenti.findFirst({
          where: { aziendaId, tipo: tipoDoc, anno },
          orderBy: { numero: 'desc' },
          select: { numero: true },
        })
        const numero = (ultimo?.numero ?? 0) + 1
        await tx.documenti.create({
          data: {
            tipo: tipoDoc, numero, anno,
            data: new Date(parsed.data),
            venditaId: vendita.id,
            clienteId: parsed.clienteId ?? null,
            importoTotale,
            stato: 'bozza',
            dataPagamentoPrevista: parsed.dataPagamentoPrevista ? new Date(parsed.dataPagamentoPrevista) : null,
            metodoPagamento: parsed.metodoPagamento ?? null,
            aziendaId,
          },
        })
      }

      // Create rate entries if rateizzato
      if (parsed.rateizzato && parsed.numeroRate && parsed.numeroRate > 1) {
        const importoRata = importoTotale / parsed.numeroRate
        const dataBase = parsed.dataPagamentoPrevista ? new Date(parsed.dataPagamentoPrevista) : new Date(parsed.data)
        for (let i = 0; i < parsed.numeroRate; i++) {
          const scadenza = new Date(dataBase)
          scadenza.setMonth(scadenza.getMonth() + i + 1)
          await tx.rate.create({
            data: {
              data: new Date(parsed.data),
              importo: importoRata,
              scadenza,
              pagata: false,
              riferimentoTipo: 'vendita',
              riferimentoId: vendita.id,
              nota: `Rata ${i + 1}/${parsed.numeroRate}`,
              aziendaId,
            },
          })
        }
      }

      // If not paid and not installment-based, create a single debit entry
      // (rateizzato sales are tracked via the rate table, not debitiAperti)
      if (!pagata && parsed.clienteId && !parsed.rateizzato) {
        await tx.debitiAperti.create({
          data: {
            data: new Date(parsed.data),
            clienteId: parsed.clienteId,
            importo: importoTotale,
            descrizione: `Vendita #${vendita.id}`,
            scadenza: parsed.dataPagamentoPrevista ? new Date(parsed.dataPagamentoPrevista) : null,
            stato: 'aperto',
            venditaId: vendita.id,
            tipo: 'cliente',
            aziendaId,
          },
        })
      }

      return tx.vendite.findUnique({
        where: { id: vendita.id },
        include: { righe: true, documenti: true },
      })
    })
    return NextResponse.json(result, { status: 201 })
  })
}