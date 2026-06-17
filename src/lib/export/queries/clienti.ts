import { prisma } from '@/lib/db'
import { type ColumnDef } from '../formatters'

export const CLIENTI_COLUMNS: ColumnDef[] = [
  { key: 'id', label: 'ID' },
  { key: 'nome', label: 'Nome' },
  { key: 'cognome', label: 'Cognome' },
  { key: 'ragioneSociale', label: 'Ragione Sociale' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'codiceFiscale', label: 'Codice Fiscale' },
  { key: 'partitaIva', label: 'Partita IVA' },
  { key: 'telefono', label: 'Telefono' },
  { key: 'email', label: 'Email' },
  { key: 'indirizzo', label: 'Indirizzo' },
  { key: 'comune', label: 'Comune' },
  { key: 'provincia', label: 'Provincia' },
  { key: 'cap', label: 'CAP' },
  { key: 'attivo', label: 'Attivo' },
  { key: 'note', label: 'Note' },
]

export async function getClientiExport(aziendaId: number): Promise<Record<string, unknown>[]> {
  const clienti = await prisma.clienti.findMany({
    where: { aziendaId },
    orderBy: [{ cognome: 'asc' }, { nome: 'asc' }],
  })

  return clienti.map((c) => ({
    id: c.id,
    nome: c.nome,
    cognome: c.cognome ?? '',
    ragioneSociale: c.ragioneSociale ?? '',
    tipo: c.tipo,
    codiceFiscale: c.codiceFiscale ?? '',
    partitaIva: c.partitaIva ?? '',
    telefono: c.telefono ?? '',
    email: c.email ?? '',
    indirizzo: c.indirizzo ?? '',
    comune: c.comune ?? '',
    provincia: c.provincia ?? '',
    cap: c.cap ?? '',
    attivo: c.attivo ? 'Sì' : 'No',
    note: c.note ?? '',
  }))
}
