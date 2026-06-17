// Valori ammessi per i campi stringa usati come enum nel DB.
// Usare sempre queste costanti invece di stringhe letterali nelle API routes e nel frontend.

export const STATO_FATTURA = {
  NON_FATTURATO: 'non_fatturato',
  DDT: 'ddt',
  FATTURA: 'fattura',
  FATTURATO: 'fatturato',
} as const
export type StatoFattura = (typeof STATO_FATTURA)[keyof typeof STATO_FATTURA]

export const STATO_PAGAMENTO = {
  DA_PAGARE: 'da_pagare',
  PAGATO: 'pagato',
  PARZIALE: 'parziale',
} as const
export type StatoPagamento = (typeof STATO_PAGAMENTO)[keyof typeof STATO_PAGAMENTO]

export const STATO_DOCUMENTO = {
  BOZZA: 'bozza',
  EMESSO: 'emesso',
  COMPLETATO: 'completato',
} as const
export type StatoDocumento = (typeof STATO_DOCUMENTO)[keyof typeof STATO_DOCUMENTO]

export const STATO_DEBITO = {
  APERTO: 'aperto',
  CHIUSO: 'chiuso',
} as const
export type StatoDebito = (typeof STATO_DEBITO)[keyof typeof STATO_DEBITO]

export const TIPO_DEBITO = {
  CLIENTE: 'cliente',
  FORNITORE: 'fornitore',
} as const
export type TipoDebito = (typeof TIPO_DEBITO)[keyof typeof TIPO_DEBITO]

export const TIPO_DOCUMENTO = {
  DDT: 'ddt',
  FATTURA: 'fattura',
} as const
export type TipoDocumento = (typeof TIPO_DOCUMENTO)[keyof typeof TIPO_DOCUMENTO]

export const TIPO_MOVIMENTO_INPUT = ['carico', 'scarico', 'vendita', 'reso'] as const
export type TipoMovimentoInput = (typeof TIPO_MOVIMENTO_INPUT)[number]

export const TIPO_MOVIMENTO_CASSA = ['entrata', 'uscita'] as const
export type TipoMovimentoCassa = (typeof TIPO_MOVIMENTO_CASSA)[number]

export const STATO_MOVIMENTO_CASSA = ['pagato', 'da_pagare', 'da_riscuotere', 'riscosso'] as const
export type StatoMovimentoCassa = (typeof STATO_MOVIMENTO_CASSA)[number]

export const TIPO_MOVIMENTO_CASSA_DETTAGLIO = [
  'entrata_generica', 'anticipo_socio', 'rimborso_azienda', 'incasso_cliente',
  'rimborso_fornitore', 'liquidazione_credito',
  'spesa', 'anticipo_azienda', 'rimborso_socio', 'stipendio', 'fornitore',
  'acquisto', 'liquidazione', 'altro',
] as const
export type TipoMovimentoCassaDettaglio = (typeof TIPO_MOVIMENTO_CASSA_DETTAGLIO)[number]

export const TIPO_MOVIMENTO_SOCI = ['credito', 'debito'] as const
export type TipoMovimentoSoci = (typeof TIPO_MOVIMENTO_SOCI)[number]
