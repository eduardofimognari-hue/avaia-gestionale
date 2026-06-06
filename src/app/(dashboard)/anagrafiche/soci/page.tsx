import { prisma } from '@/lib/db'
import { getCurrentAziendaId } from '@/lib/azienda-context'
import { redirect } from 'next/navigation'
import { SociClient } from './soci-client'

export default async function SociPage() {
  const aziendaId = await getCurrentAziendaId()
  if (!aziendaId) redirect('/login')

  const [soci, aree, ruoli] = await Promise.all([
    prisma.soci.findMany({
      where: { aziendaId },
      include: {
        responsabilita: { include: { area: { select: { id: true, nome: true } } } },
        ruoli: { include: { ruolo: { select: { id: true, nome: true } } } },
      },
      orderBy: { cognome: 'asc' },
    }),
    prisma.aree.findMany({ where: { aziendaId, attivo: true }, orderBy: { nome: 'asc' } }),
    prisma.ruoli.findMany({ where: { aziendaId, attivo: true }, orderBy: { nome: 'asc' } }),
  ])

  const serialized = soci.map(s => ({
    ...s,
    dataIngresso: s.dataIngresso?.toISOString() ?? null,
    dataUscita: s.dataUscita?.toISOString() ?? null,
    creatoIl: s.creatoIl.toISOString(),
  }))

  return <SociClient initialData={serialized} aree={aree} ruoliList={ruoli} />
}
