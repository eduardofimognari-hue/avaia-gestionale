import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { redirect } from 'next/navigation'
import { VenditeClient } from './vendite-client'

export default async function VenditePage() {
  const aziendaId = await getCurrentAziendaId()
  if (!aziendaId) redirect('/login')

  const vendite = await prisma.vendite.findMany({
    where: { aziendaId },
    include: {
      cliente: { select: { id: true, nome: true, cognome: true } },
      righe: { include: { prodotto: { select: { id: true, nome: true, varietaTipologia: true } } } },
      documenti: { select: { tipo: true, numero: true, anno: true, stato: true } },
    },
    orderBy: { data: 'desc' },
    take: 100,
  })

  const serialized = vendite.map(v => ({
    ...v,
    data: v.data.toISOString(),
    dataPagamentoPrevista: v.dataPagamentoPrevista?.toISOString() ?? null,
    importoTotale: v.importoTotale ?? null,
    righe: v.righe.map(r => ({ ...r, creatoIl: r.creatoIl.toISOString() })),
    documenti: v.documenti,
    creatoIl: v.creatoIl.toISOString(),
  }))

  return <VenditeClient initialData={serialized} />
}
