import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { requireRole } from '@/lib/auth'

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const aziendaId = await getCurrentAziendaId()
    if (!aziendaId) return NextResponse.json({ error: 'Nessuna azienda selezionata' }, { status: 400 })
    const check = await requireRole(['admin', 'editor'], aziendaId)
    if (!check.allowed) return check.response!

    const liquidazioneId = parseInt(params.id)
    if (!liquidazioneId) return NextResponse.json({ error: 'ID liquidazione non valido' }, { status: 400 })

    const liquidazione = await prisma.liquidazioniSoci.findFirst({
      where: { id: liquidazioneId, aziendaId },
      include: { socio: true },
    })
    if (!liquidazione) return NextResponse.json({ error: 'Liquidazione non trovata' }, { status: 404 })
    if (liquidazione.stato === 'pagato') return NextResponse.json({ error: 'Liquidazione già pagata' }, { status: 400 })

    const body = await request.json()

    if (body.azione === 'paga' && liquidazione.importoNetto !== 0) {
      const primaCassa = await prisma.casseInterne.findFirst({ where: { aziendaId }, orderBy: { id: 'asc' } })
      if (!primaCassa) return NextResponse.json({ error: 'Nessuna cassa configurata' }, { status: 400 })

      const isRimborsoSocio = liquidazione.importoNetto > 0

      const movimentoCassa = await prisma.movimentiCassa.create({
        data: {
          data: new Date(),
          cassaId: primaCassa.id,
          aziendaId,
          socioId: liquidazione.socioId,
          tipo: isRimborsoSocio ? 'uscita' : 'entrata',
          tipoMovimento: isRimborsoSocio ? 'rimborso_socio' : 'rimborso_azienda',
          importo: Math.abs(liquidazione.importoNetto),
          categoria: 'Liquidazione',
          descrizione: isRimborsoSocio
            ? `Rimborso socio ${liquidazione.socio.nome} ${liquidazione.socio.cognome} - Liquidazione #${liquidazioneId}`
            : `Recupero debito da ${liquidazione.socio.nome} ${liquidazione.socio.cognome} - Liquidazione #${liquidazioneId}`,
          riferimento: `Liquidazione #${liquidazioneId}`,
        },
      })

      // Marca come liquidati i movimentiSoci aperti più vecchi di quel socio, fino a coprire l'importo
      const daLiquidare = await prisma.movimentiSoci.findMany({
        where: {
          aziendaId,
          socioId: liquidazione.socioId,
          liquidato: false,
          tipo: isRimborsoSocio ? 'credito' : 'debito',
        },
        orderBy: { data: 'asc' },
      })

      let daCoprire = Math.abs(liquidazione.importoNetto)
      for (const m of daLiquidare) {
        if (daCoprire <= 0) break
        await prisma.movimentiSoci.update({
          where: { id: m.id },
          data: { liquidato: true, liquidazioneId },
        })
        daCoprire -= m.importo
      }

      await prisma.liquidazioniSoci.update({
        where: { id: liquidazioneId },
        data: { stato: 'pagato', dataPagamento: new Date(), movimentoCassaId: movimentoCassa.id },
      })

      const updated = await prisma.liquidazioniSoci.findUnique({
        where: { id: liquidazioneId },
        include: {
          socio: { select: { id: true, nome: true, cognome: true } },
          movimenti: { select: { id: true, tipo: true, importo: true, categoria: true, descrizione: true } },
          movimentoCassa: { select: { id: true, importo: true, tipo: true, data: true } },
        },
      })

      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: 'Azione non valida' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Errore nell\'aggiornamento liquidazione' }, { status: 500 })
  }
}
