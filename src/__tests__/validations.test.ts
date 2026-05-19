import { describe, it, expect } from 'vitest'
import { sociSchema, clientiSchema, prodottiSchema, magazzinoMovimentoSchema, debitiSchema, cassaMovimentoSchema } from '@/lib/validations'

describe('sociSchema', () => {
  it('accetta dati validi', () => {
    const result = sociSchema.parse({ nome: 'Mario', cognome: 'Rossi' })
    expect(result.nome).toBe('Mario')
    expect(result.cognome).toBe('Rossi')
  })

  it('rifiuta nome mancante', () => {
    expect(() => sociSchema.parse({ cognome: 'Rossi' })).toThrow()
  })

  it('rifiuta body vuoto', () => {
    expect(() => sociSchema.parse({})).toThrow()
  })

  it('accetta campi opzionali nulli', () => {
    const result = sociSchema.parse({ nome: 'Mario', cognome: 'Rossi', email: null, telefono: undefined })
    expect(result.email).toBeNull()
  })
})

describe('clientiSchema', () => {
  it('accetta solo nome obbligatorio', () => {
    const result = clientiSchema.parse({ nome: 'Cliente SRL' })
    expect(result.nome).toBe('Cliente SRL')
  })

  it('usa default tipo Privato', () => {
    const result = clientiSchema.parse({ nome: 'Test' })
    expect(result.tipo).toBe('Privato')
  })
})

describe('prodottiSchema', () => {
  it('accetta solo nome', () => {
    const result = prodottiSchema.parse({ nome: 'Mela' })
    expect(result.nome).toBe('Mela')
    expect(result.unitaMisura).toBe('kg')
  })

  it('rifiuta nome vuoto', () => {
    expect(() => prodottiSchema.parse({ nome: '' })).toThrow()
  })

  it('accetta tipo personalizzato', () => {
    const result = prodottiSchema.parse({ nome: 'Farina', tipo: 'materiale' })
    expect(result.tipo).toBe('materiale')
  })
})

describe('magazzinoMovimentoSchema', () => {
  it('accetta carico valido', () => {
    const result = magazzinoMovimentoSchema.parse({
      data: '2024-01-15', prodottoId: 1, tipo: 'carico', quantita: 100, unitaMisura: 'kg',
    })
    expect(result.tipo).toBe('carico')
  })

  it('rifiuta tipo non valido', () => {
    expect(() => magazzinoMovimentoSchema.parse({
      data: '2024-01-15', prodottoId: 1, tipo: 'cancella', quantita: 100, unitaMisura: 'kg',
    })).toThrow()
  })

  it('rifiuta quantita negativa', () => {
    expect(() => magazzinoMovimentoSchema.parse({
      data: '2024-01-15', prodottoId: 1, tipo: 'carico', quantita: -5, unitaMisura: 'kg',
    })).toThrow()
  })
})

describe('cassaMovimentoSchema', () => {
  it('accetta movimento spesa valido', () => {
    const result = cassaMovimentoSchema.parse({
      cassaId: 1, tipo: 'uscita', tipoMovimento: 'spesa', importo: 100.50,
      luogoId: 2, descrizione: 'Spesa materiali',
    })
    expect(result.tipoMovimento).toBe('spesa')
    expect(result.importo).toBe(100.50)
  })

  it('accetta anticipo socio con socioId', () => {
    const result = cassaMovimentoSchema.parse({
      cassaId: 1, tipo: 'entrata', tipoMovimento: 'anticipo_socio', importo: 500,
      socioId: 3, descrizione: 'Anticipo per acquisto arnie',
    })
    expect(result.tipoMovimento).toBe('anticipo_socio')
    expect(result.socioId).toBe(3)
  })

  it('usa default tipoMovimento se non specificato', () => {
    const result = cassaMovimentoSchema.parse({
      cassaId: 1, tipo: 'entrata', importo: 100,
    })
    expect(result.tipoMovimento).toBe('altro')
  })

  it('rifiuta importo negativo', () => {
    expect(() => cassaMovimentoSchema.parse({
      cassaId: 1, tipo: 'entrata', importo: -10,
    })).toThrow()
  })

  it('rifiuta tipoMovimento non valido', () => {
    expect(() => cassaMovimentoSchema.parse({
      cassaId: 1, tipo: 'entrata', tipoMovimento: 'non_valido', importo: 100,
    })).toThrow()
  })
})

describe('debitiSchema', () => {
  it('accetta importo minimo', () => {
    const result = debitiSchema.parse({ importo: 100 })
    expect(result.importo).toBe(100)
  })

  it('rifiuta importo mancante', () => {
    expect(() => debitiSchema.parse({})).toThrow()
  })
})
