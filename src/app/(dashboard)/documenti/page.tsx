import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { redirect } from 'next/navigation'
import { DocumentiClient } from './documenti-client'

export default async function DocumentiPage() {
  const aziendaId = await getCurrentAziendaId()
  if (!aziendaId) redirect('/login')

  const [documenti, vendite] = await Promise.all([
    prisma.documenti.findMany({
      where: { aziendaId },
      include: {
        vendita: { select: { id: true, data: true, importoTotale: true, tipoCliente: true } },
        cliente: { select: { id: true, nome: true, cognome: true, ragioneSociale: true, partitaIva: true } },
      },
      orderBy: { data: 'desc' },
    }),
    prisma.vendite.findMany({
      where: { aziendaId },
      select: {
        id: true, data: true, importoTotale: true, tipoCliente: true,
        cliente: { select: { id: true, nome: true, cognome: true } },
      },
      orderBy: { data: 'desc' },
      take: 100,
    }),
  ])

  const serializedDocumenti = documenti.map(d => ({
    ...d,
    data: d.data.toISOString(),
    dataPagamentoPrevista: d.dataPagamentoPrevista?.toISOString() ?? null,
    dataPagamento: d.dataPagamento?.toISOString() ?? null,
    creatoIl: d.creatoIl.toISOString(),
    vendita: d.vendita ? { ...d.vendita, data: d.vendita.data.toISOString() } : null,
  }))

  const serializedVendite = vendite.map(v => ({
    ...v,
    data: v.data.toISOString(),
  }))

  return <DocumentiClient initialDocumenti={serializedDocumenti} vendite={serializedVendite} />
}
