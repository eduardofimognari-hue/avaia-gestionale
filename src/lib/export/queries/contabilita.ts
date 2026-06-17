import { prisma } from '@/lib/db'
import { formatDate, formatNumber, type ColumnDef } from '../formatters'

export const CONTABILITA_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'data', label: 'Data' },
  { key: 'cassa', label: 'Cassa' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'tipoMovimento', label: 'Tipo Movimento' },
  { key: 'importo', label: 'Importo (€)' },
  { key: 'categoria', label: 'Categoria' },
  { key: 'descrizione', label: 'Descrizione' },
  { key: 'luogo', label: 'Luogo' },
  { key: 'socio', label: 'Socio' },
  { key: 'stato', label: 'Stato' },
  { key: 'riferimento', label: 'Riferimento' },
]

export async function getContabilitaExport(
  aziendaId: number,
  from?: Date,
  to?: Date,
): Promise<Record<string, unknown>[]> {
  const movimenti = await prisma.movimentiCassa.findMany({
    where: {
      aziendaId,
      data: {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
      },
    },
    include: {
      cassa: { select: { nome: true } },
      luogo: { select: { nome: true } },
      socio: { select: { nome: true, cognome: true } },
    },
    orderBy: { data: 'desc' },
  })

  return movimenti.map((m) => ({
    id: m.id,
    data: formatDate(m.data),
    cassa: m.cassa.nome,
    tipo: m.tipo,
    tipoMovimento: m.tipoMovimento,
    importo: formatNumber(m.importo),
    categoria: m.categoria ?? '',
    descrizione: m.descrizione ?? '',
    luogo: m.luogo?.nome ?? '',
    socio: m.socio ? `${m.socio.nome} ${m.socio.cognome}` : '',
    stato: m.stato,
    riferimento: m.riferimento ?? '',
  }))
}
