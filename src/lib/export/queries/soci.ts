import { prisma } from '@/lib/db'
import { formatDate, type ColumnDef } from '../formatters'

export const SOCI_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'nome', label: 'Nome' },
  { key: 'cognome', label: 'Cognome' },
  { key: 'codiceFiscale', label: 'Codice Fiscale' },
  { key: 'telefono', label: 'Telefono' },
  { key: 'email', label: 'Email' },
  { key: 'indirizzo', label: 'Indirizzo' },
  { key: 'dataIngresso', label: 'Data Ingresso' },
  { key: 'dataUscita', label: 'Data Uscita' },
  { key: 'ruoli', label: 'Ruoli' },
  { key: 'aree', label: 'Aree Responsabilità' },
  { key: 'attivo', label: 'Attivo' },
  { key: 'note', label: 'Note' },
]

export async function getSociExport(aziendaId: number): Promise<Record<string, unknown>[]> {
  const soci = await prisma.soci.findMany({
    where: { aziendaId },
    include: {
      ruoli: { include: { ruolo: { select: { nome: true } } } },
      responsabilita: { include: { area: { select: { nome: true } } } },
    },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
  })

  return soci.map((s) => ({
    id: s.id,
    nome: s.nome,
    cognome: s.cognome,
    codiceFiscale: s.codiceFiscale ?? '',
    telefono: s.telefono ?? '',
    email: s.email ?? '',
    indirizzo: s.indirizzo ?? '',
    dataIngresso: formatDate(s.dataIngresso),
    dataUscita: formatDate(s.dataUscita),
    ruoli: s.ruoli.map((r) => r.ruolo.nome).join(', '),
    aree: s.responsabilita.map((r) => r.area.nome).join(', '),
    attivo: s.attivo ? 'Sì' : 'No',
    note: s.note ?? '',
  }))
}
