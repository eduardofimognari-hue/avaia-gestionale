import { z } from 'zod'
import {
  TIPO_MOVIMENTO_INPUT,
  TIPO_MOVIMENTO_CASSA,
  TIPO_MOVIMENTO_CASSA_DETTAGLIO,
  STATO_MOVIMENTO_CASSA,
  TIPO_MOVIMENTO_SOCI,
  TIPO_DOCUMENTO,
} from './constants'

export const sociSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
  cognome: z.string().min(1, 'Cognome obbligatorio'),
  codiceFiscale: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  indirizzo: z.string().optional().nullable(),
  dataIngresso: z.string().optional().nullable(),
  dataUscita: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
  responsabilita: z.array(z.number()).optional(),
  ruoli: z.array(z.number()).optional(),
})

export const clientiSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
  cognome: z.string().optional().nullable(),
  ragioneSociale: z.string().optional().nullable(),
  tipo: z.string().optional().default('Privato'),
  codiceFiscale: z.string().optional().nullable(),
  partitaIva: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal('')),
  indirizzo: z.string().optional().nullable(),
  comune: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  cap: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})

export const prodottiSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
  varietaTipologia: z.string().optional().nullable(),
  categoria: z.string().optional().nullable(),
  tipo: z.string().optional().default('prodotto'),
  unitaMisura: z.string().optional().default('kg'),
  note: z.string().optional().nullable(),
})

export const areeSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
  descrizione: z.string().optional().nullable(),
})

export const luoghiSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
  indirizzo: z.string().optional().nullable(),
  comune: z.string().optional().nullable(),
  provincia: z.string().optional().nullable(),
  cap: z.string().optional().nullable(),
  tipologia: z.string().optional().default('reale'),
  categoria: z.string().optional().default('produttivo'),
  usoAziendale: z.boolean().optional().default(true),
  note: z.string().optional().nullable(),
})

export const listinoSchema = z.object({
  anno: z.number({ required_error: 'Anno obbligatorio' }),
  prodottoId: z.number({ required_error: 'Prodotto obbligatorio' }),
  tipoCliente: z.string().min(1, 'Tipo cliente obbligatorio'),
  formato: z.string().min(1, 'Formato obbligatorio'),
  unitaMisura: z.string().min(1, 'Unità misura obbligatoria'),
  prezzoBase: z.number({ required_error: 'Prezzo base obbligatorio' }),
  dataInizio: z.string().optional().nullable(),
  dataFine: z.string().optional().nullable(),
  note: z.string().optional().nullable(),
})

export const magazzinoMovimentoSchema = z.object({
  data: z.string().min(1, 'Data obbligatoria'),
  prodottoId: z.number({ required_error: 'Prodotto obbligatorio' }),
  tipo: z.enum(TIPO_MOVIMENTO_INPUT, { required_error: 'Tipo non valido' }),
  quantita: z.number().positive('Quantità deve essere positiva'),
  unitaMisura: z.string().min(1, 'Unità misura obbligatoria'),
  luogoId: z.number().optional().nullable(),
  terrenoId: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
})

export const cassaNuovaSchema = z.object({
  nome: z.string().min(1, 'Nome obbligatorio'),
  saldoIniziale: z.number().optional().default(0),
  note: z.string().optional().nullable(),
})

export const cassaMovimentoSchema = z.object({
  cassaId: z.number({ required_error: 'Cassa obbligatoria' }).optional(),
  data: z.string().optional(),
  luogoId: z.number().optional().nullable(),
  socioId: z.number().optional().nullable(),
  tipo: z.enum(TIPO_MOVIMENTO_CASSA, { required_error: 'Tipo non valido' }),
  tipoMovimento: z.enum(TIPO_MOVIMENTO_CASSA_DETTAGLIO, { required_error: 'Tipo movimento non valido' }).optional().default('altro'),
  importo: z.number().positive('Importo deve essere positivo'),
  categoria: z.string().optional().nullable(),
  descrizione: z.string().optional().nullable(),
  riferimento: z.string().optional().nullable(),
  riferimentoId: z.number().optional().nullable(),
  riferimentoTipo: z.string().optional().nullable(),
  stato: z.enum(STATO_MOVIMENTO_CASSA).optional().default('pagato'),
  ricorrente: z.boolean().optional().default(false),
})

export const movimentiSociSchema = z.object({
  data: z.string().optional(),
  socioId: z.number({ required_error: 'Socio obbligatorio' }),
  tipo: z.enum(TIPO_MOVIMENTO_SOCI, { required_error: 'Tipo non valido' }),
  importo: z.number({ required_error: 'Importo obbligatorio' }).positive('Importo deve essere positivo'),
  categoria: z.string().optional().nullable(),
  descrizione: z.string().optional().nullable(),
})

export const liquidazioniSociSchema = z.object({
  data: z.string().optional(),
  socioId: z.number({ required_error: 'Socio obbligatorio' }),
  tipo: z.enum(TIPO_MOVIMENTO_SOCI, { required_error: 'Tipo non valido' }),
  importo: z.number({ required_error: 'Importo obbligatorio' }).positive('Importo deve essere positivo'),
  note: z.string().optional().nullable(),
})

export const debitiSchema = z.object({
  data: z.string().optional(),
  clienteId: z.number().optional().nullable(),
  importo: z.number({ required_error: 'Importo obbligatorio' }),
  descrizione: z.string().optional().nullable(),
  scadenza: z.string().optional().nullable(),
  venditaId: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
})

export const lavoroSociSchema = z.object({
  data: z.string().min(1, 'Data obbligatoria'),
  socioId: z.number({ required_error: 'Socio obbligatorio' }),
  areaId: z.number().optional().nullable(),
  luogoId: z.number().optional().nullable(),
  ore: z.number().positive('Ore deve essere positivo'),
  descrizione: z.string().optional().nullable(),
})

export const regoleRipartizioneSchema = z.object({
  luogoSorgenteId: z.number({ required_error: 'Luogo sorgente obbligatorio' }),
  luogoDestinazioneId: z.number({ required_error: 'Luogo destinazione obbligatorio' }),
  percentuale: z.number().min(0).max(100, 'Percentuale deve essere tra 0 e 100'),
  anno: z.number({ required_error: 'Anno obbligatorio' }),
})

export const venditaNuovaSchema = z.object({
  data: z.string().min(1, 'Data obbligatoria'),
  clienteId: z.number().optional().nullable(),
  tipoCliente: z.string().min(1, 'Tipo cliente obbligatorio'),
  righe: z.array(z.object({
    prodottoId: z.number(),
    formato: z.string().optional().nullable(),
    quantita: z.number().positive(),
    prezzoUnitario: z.number(),
  })).min(1, 'Almeno una riga richiesta'),
})

export const raccoltaSchema = z.object({
  data: z.string().min(1, 'Data obbligatoria'),
  prodottoId: z.number({ required_error: 'Prodotto obbligatorio' }),
  quantita: z.number().positive('Quantità deve essere positiva'),
  unitaMisura: z.string().optional().default('kg'),
  luogoId: z.number().optional().nullable(),
  terrenoId: z.number().optional().nullable(),
  socioId: z.number().optional().nullable(),
  note: z.string().optional().nullable(),
})

export const documentoGeneratoSchema = z.object({
  tipo: z.nativeEnum(TIPO_DOCUMENTO, { required_error: 'Tipo documento obbligatorio' }),
  venditaId: z.number({ required_error: 'Vendita obbligatoria' }),
  data: z.string().optional(),
  note: z.string().optional().nullable(),
})

export const utenteSchema = z.object({
  email: z.string().email('Email non valida'),
  nome: z.string().min(1, 'Nome obbligatorio'),
  password: z.string().min(6, 'Password almeno 6 caratteri'),
  ruolo: z.string().optional().default('editor'),
})

// ─── Schema PATCH (aggiornamento parziale) ───────────────────────────────────
// Permettono solo i campi modificabili, bloccando id, aziendaId, creatoIl, codice.

export const prodottiPatchSchema = z.object({
  nome: z.string().min(1).optional(),
  varietaTipologia: z.string().nullable().optional(),
  categoria: z.string().nullable().optional(),
  tipo: z.string().optional(),
  unitaMisura: z.string().optional(),
  aliquotaIva: z.number().optional(),
  attivo: z.boolean().optional(),
  note: z.string().nullable().optional(),
})

export const clientiPatchSchema = z.object({
  nome: z.string().min(1).optional(),
  cognome: z.string().nullable().optional(),
  ragioneSociale: z.string().nullable().optional(),
  tipo: z.string().optional(),
  codiceFiscale: z.string().nullable().optional(),
  partitaIva: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  indirizzo: z.string().nullable().optional(),
  comune: z.string().nullable().optional(),
  provincia: z.string().nullable().optional(),
  cap: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
  attivo: z.boolean().optional(),
})

export const sociPatchSchema = z.object({
  nome: z.string().min(1).optional(),
  cognome: z.string().min(1).optional(),
  codiceFiscale: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal('')),
  indirizzo: z.string().nullable().optional(),
  dataIngresso: z.string().nullable().optional(),
  dataUscita: z.string().nullable().optional(),
  attivo: z.boolean().optional(),
  note: z.string().nullable().optional(),
  responsabilita: z.array(z.number()).optional(),
  ruoli: z.array(z.number()).optional(),
})

export const attrezzaturePatchSchema = z.object({
  nome: z.string().min(1).optional(),
  categoria: z.string().nullable().optional(),
  fornitoreId: z.number().nullable().optional(),
  costoUnitario: z.number().nullable().optional(),
  unitaMisura: z.string().optional(),
  scortaMinima: z.number().nullable().optional(),
  quantita: z.number().optional(),
  note: z.string().nullable().optional(),
  attivo: z.boolean().optional(),
})

export const venditePatchSchema = z.object({
  pagata: z.boolean().optional(),
  statoPagamento: z.string().optional(),
  metodoPagamento: z.string().nullable().optional(),
  dataPagamentoPrevista: z.string().nullable().optional(),
})
