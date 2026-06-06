import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { redirect } from 'next/navigation'
import { ContabilitaClient } from './contabilita-client'

export default async function ContabilitaPage() {
  const aziendaId = await getCurrentAziendaId()
  if (!aziendaId) redirect('/login')

  const [casse, luoghi, movimenti, soci, posizioniSoci, vendite, documenti, debitiClienti, debitiFornitori] = await Promise.all([
    prisma.casseInterne.findMany({
      where: { aziendaId },
      include: { movimenti: { select: { tipo: true, importo: true, luogoId: true } } },
    }),
    prisma.luoghi.findMany({ where: { aziendaId, attivo: true } }),
    prisma.movimentiCassa.findMany({
      where: { aziendaId },
      include: {
        cassa: { select: { nome: true } },
        luogo: { select: { id: true, nome: true, tipologia: true } },
        socio: { select: { id: true, nome: true, cognome: true } },
      },
      orderBy: { data: 'desc' },
      take: 100,
    }),
    prisma.soci.findMany({ where: { aziendaId, attivo: true }, select: { id: true, nome: true, cognome: true } }),
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
    prisma.debitiAperti.findMany({
      where: { aziendaId, stato: 'aperto', tipo: 'cliente' },
      include: { cliente: { select: { id: true, nome: true, cognome: true, ragioneSociale: true } } },
      orderBy: { scadenza: 'asc' },
    }),
    prisma.debitiAperti.findMany({
      where: { aziendaId, stato: 'aperto', tipo: 'fornitore' },
      include: { fornitore: { select: { id: true, nome: true, cognome: true, ragioneSociale: true } } },
      orderBy: { scadenza: 'asc' },
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
      data: v.data.toISOString(),
    })),
    ...documenti.map(d => ({
      id: d.id, tipo: d.tipo,
      label: `${d.tipo.toUpperCase()} #${d.numero}/${d.anno} - €${d.importoTotale}`,
      data: d.data.toISOString(),
    })),
  ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

  const serializedCasse = casse.map(c => ({
    ...c,
    creatoIl: c.creatoIl.toISOString(),
  }))

  const serializedMovimenti = movimenti.map(m => ({
    ...m,
    data: m.data.toISOString(),
    creatoIl: m.creatoIl.toISOString(),
  }))

  const serializedDebitiClienti = debitiClienti.map(d => ({
    ...d,
    data: d.data.toISOString(),
    scadenza: d.scadenza?.toISOString() ?? null,
    dataSaldo: d.dataSaldo?.toISOString() ?? null,
    creatoIl: d.creatoIl.toISOString(),
  }))

  const serializedDebitiFornitori = debitiFornitori.map(d => ({
    ...d,
    data: d.data.toISOString(),
    scadenza: d.scadenza?.toISOString() ?? null,
    dataSaldo: d.dataSaldo?.toISOString() ?? null,
    creatoIl: d.creatoIl.toISOString(),
  }))

  return (
    <ContabilitaClient
      initialCasse={serializedCasse}
      initialMovimenti={serializedMovimenti}
      luoghi={luoghi}
      soci={soci}
      initialPosizioniAperte={posizioniAperte}
      initialDebitiClienti={serializedDebitiClienti}
      initialDebitiFornitori={serializedDebitiFornitori}
      riferimenti={riferimenti}
      cassaUnica={casse[0] ? { id: casse[0].id, nome: casse[0].nome } : null}
    />
  )
}
