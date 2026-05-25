import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // Azienda di default
  const azienda = await prisma.azienda.create({
    data: { nome: 'Kairos', slug: 'kairos' },
  })

  const adminPassword = await bcrypt.hash('avaia-demo', 10)
  await prisma.utente.create({
    data: { email: 'admin@avaia.it', nome: 'Admin', password: adminPassword, ruolo: 'admin', aziendaId: azienda.id },
  })

  const editorPassword = await bcrypt.hash('editor-demo', 10)
  await prisma.utente.create({
    data: { email: 'editor@avaia.it', nome: 'Editor Demo', password: editorPassword, ruolo: 'editor', aziendaId: azienda.id },
  })

  // Ruoli soci
  const ruoli: Record<string, { id: number }> = {}
  for (const nome of ['Socio Amministratore', 'Socio Lavoratore', 'Responsabile Legale', 'Socio Fondatore', 'Socio Finanziatore']) {
    ruoli[nome] = await prisma.ruoli.create({ data: { nome, aziendaId: azienda.id } })
  }

  const prodottiData = [
    { codice: 'PROD-0001', nome: 'Miele', varietaTipologia: 'Millefiori', categoria: 'Miele', tipo: 'prodotto', unitaMisura: 'kg' },
    { codice: 'PROD-0002', nome: 'Miele', varietaTipologia: 'Millefiori (selected)', categoria: 'Miele', tipo: 'prodotto', unitaMisura: 'kg' },
    { codice: 'PROD-0003', nome: 'Miele', varietaTipologia: 'Millefiori (sfuso)', categoria: 'Miele', tipo: 'prodotto', unitaMisura: 'kg' },
    { codice: 'PROD-0004', nome: 'Avocado', varietaTipologia: 'Hass', categoria: 'Avocado', tipo: 'prodotto', unitaMisura: 'kg' },
    { codice: 'PROD-0005', nome: 'Limone', varietaTipologia: 'Zagara Bianca', categoria: 'Limone', tipo: 'prodotto', unitaMisura: 'kg' },
    { codice: 'PROD-0006', nome: 'Arancia', varietaTipologia: 'Tarocco', categoria: 'Arancia', tipo: 'prodotto', unitaMisura: 'kg' },
    { codice: 'PROD-0007', nome: 'Olio Extravergine', varietaTipologia: 'Bio', categoria: 'Olio', tipo: 'prodotto', unitaMisura: 'l' },
    { codice: 'MAT-0001', nome: 'Arnia', varietaTipologia: 'Standard', categoria: 'Api', tipo: 'materiale', unitaMisura: 'pezzi' },
    { codice: 'MAT-0002', nome: 'Telaio', varietaTipologia: 'Legno', categoria: 'Api', tipo: 'materiale', unitaMisura: 'pezzi' },
    { codice: 'MAT-0003', nome: 'Cera d\'api', varietaTipologia: 'Fogli cerei', categoria: 'Api', tipo: 'materiale', unitaMisura: 'kg' },
    { codice: 'MAT-0004', nome: 'Smielatore', varietaTipologia: 'Acciaio 4 telai', categoria: 'Api', tipo: 'materiale', unitaMisura: 'pezzi' },
  ]

  const prodotti: Record<string, { id: number }> = {}
  for (const d of prodottiData) {
    const p = await prisma.prodotti.create({ data: { ...d, aziendaId: azienda.id } })
    prodotti[d.codice] = p
  }

  const listinoData = [
    { prodottoId: prodotti['PROD-0001'].id, anno: 2026, tipoCliente: 'Privato', formato: 'vasetto 250g', unitaMisura: 'vasetti', prezzoBase: 5.00 },
    { prodottoId: prodotti['PROD-0001'].id, anno: 2026, tipoCliente: 'Ingrosso', formato: 'vasetto 250g', unitaMisura: 'vasetti', prezzoBase: 4.00 },
    { prodottoId: prodotti['PROD-0001'].id, anno: 2026, tipoCliente: 'Privato', formato: 'vasetto 500g', unitaMisura: 'vasetti', prezzoBase: 10.00 },
    { prodottoId: prodotti['PROD-0001'].id, anno: 2026, tipoCliente: 'Ingrosso', formato: 'vasetto 500g', unitaMisura: 'vasetti', prezzoBase: 8.00 },
    { prodottoId: prodotti['PROD-0001'].id, anno: 2026, tipoCliente: 'Privato', formato: 'vasetto 1kg', unitaMisura: 'vasetti', prezzoBase: 20.00 },
    { prodottoId: prodotti['PROD-0001'].id, anno: 2026, tipoCliente: 'Ingrosso', formato: 'vasetto 1kg', unitaMisura: 'vasetti', prezzoBase: 15.00 },
    { prodottoId: prodotti['PROD-0003'].id, anno: 2026, tipoCliente: 'Privato', formato: 'kg sfuso', unitaMisura: 'kg', prezzoBase: 18.00 },
    { prodottoId: prodotti['PROD-0003'].id, anno: 2026, tipoCliente: 'Ingrosso', formato: 'kg sfuso', unitaMisura: 'kg', prezzoBase: 13.00 },
    { prodottoId: prodotti['PROD-0004'].id, anno: 2026, tipoCliente: 'Privato', formato: 'kg', unitaMisura: 'kg', prezzoBase: 6.00 },
    { prodottoId: prodotti['PROD-0004'].id, anno: 2026, tipoCliente: 'Ingrosso', formato: 'kg', unitaMisura: 'kg', prezzoBase: 4.00 },
    { prodottoId: prodotti['PROD-0004'].id, anno: 2026, tipoCliente: 'Privato', formato: 'cassetta', unitaMisura: 'kg', prezzoBase: 5.00 },
    { prodottoId: prodotti['PROD-0004'].id, anno: 2026, tipoCliente: 'Ingrosso', formato: 'cassetta', unitaMisura: 'kg', prezzoBase: 4.00 },
    { prodottoId: prodotti['PROD-0005'].id, anno: 2026, tipoCliente: 'Privato', formato: 'kg', unitaMisura: 'kg', prezzoBase: 1.50 },
    { prodottoId: prodotti['PROD-0005'].id, anno: 2026, tipoCliente: 'Ingrosso', formato: 'kg', unitaMisura: 'kg', prezzoBase: 0.30 },
    { prodottoId: prodotti['PROD-0005'].id, anno: 2026, tipoCliente: 'Privato', formato: 'cassetta', unitaMisura: 'kg', prezzoBase: 1.00 },
    { prodottoId: prodotti['PROD-0005'].id, anno: 2026, tipoCliente: 'Ingrosso', formato: 'cassetta', unitaMisura: 'kg', prezzoBase: 0.30 },
  ]

  for (const d of listinoData) {
    await prisma.listinoPrezzi.create({
      data: { ...d, aziendaId: azienda.id, dataInizio: new Date('2026-01-01'), dataFine: new Date('2026-12-31'), attivo: true },
    })
  }

  await prisma.clienti.create({ data: { nome: 'Mario', cognome: 'Rossi', tipo: 'Privato', aziendaId: azienda.id } })
  await prisma.clienti.create({ data: { nome: 'Azienda Agricola Bio SRL', ragioneSociale: 'Azienda Agricola Bio SRL', tipo: 'Ingrosso', aziendaId: azienda.id } })
  await prisma.clienti.create({ data: { nome: 'Anna', cognome: 'Verdi', tipo: 'Privato', aziendaId: azienda.id } })

  const giovanni = await prisma.soci.create({ data: { nome: 'Giovanni', cognome: 'Bianchi', aziendaId: azienda.id } })
  const maria = await prisma.soci.create({ data: { nome: 'Maria', cognome: 'Neri', aziendaId: azienda.id } })

  await prisma.sociRuoli.create({ data: { socioId: giovanni.id, ruoloId: ruoli['Socio Amministratore'].id } })
  await prisma.sociRuoli.create({ data: { socioId: giovanni.id, ruoloId: ruoli['Socio Fondatore'].id } })
  await prisma.sociRuoli.create({ data: { socioId: maria.id, ruoloId: ruoli['Socio Lavoratore'].id } })

  await prisma.luoghi.create({ data: { nome: 'Santa Venerina', tipo: 'fisico', aziendaId: azienda.id } })
  await prisma.luoghi.create({ data: { nome: 'Stazzo', tipo: 'fisico', aziendaId: azienda.id } })
  await prisma.luoghi.create({ data: { nome: 'Api', tipo: 'fisico', note: 'Apiari e arnie', aziendaId: azienda.id } })
  await prisma.luoghi.create({     data: { nome: 'Amministrazione', tipo: 'virtuale', note: 'Spese generali aziendali', aziendaId: azienda.id } })

  const aree: Record<string, { id: number }> = {}
  for (const nome of ['Agro', 'Api', 'Amministrazione', 'Commerciale', 'Mista', 'Servizi']) {
    const a = await prisma.aree.create({ data: { nome, descrizione: `Area ${nome}`, aziendaId: azienda.id } })
    aree[nome] = a
  }

  await prisma.sociAreeResponsabilita.create({ data: { socioId: giovanni.id, areaId: aree['Amministrazione'].id } })
  await prisma.sociAreeResponsabilita.create({ data: { socioId: giovanni.id, areaId: aree['Commerciale'].id } })
  await prisma.sociAreeResponsabilita.create({ data: { socioId: maria.id, areaId: aree['Agro'].id } })
  await prisma.sociAreeResponsabilita.create({ data: { socioId: maria.id, areaId: aree['Api'].id } })

  for (const socio of [giovanni, maria]) {
    for (const [nome, area] of Object.entries(aree)) {
      await prisma.tariffeLavoro.create({
        data: { socioId: socio.id, areaId: area.id, costoOrario: nome === 'Amministrazione' ? 12 : 10, anno: 2026, aziendaId: azienda.id },
      })
    }
  }

  const cassaKairos = await prisma.casseInterne.create({
    data: { nome: 'Cassa Unica', saldoIniziale: 5000.00, note: 'Conto corrente aziendale principale', aziendaId: azienda.id },
  })

  const amminLuogo = await prisma.luoghi.findFirst({ where: { nome: 'Amministrazione', aziendaId: azienda.id } })
  const sv = await prisma.luoghi.findFirst({ where: { nome: 'Santa Venerina', aziendaId: azienda.id } })
  const st = await prisma.luoghi.findFirst({ where: { nome: 'Stazzo', aziendaId: azienda.id } })
  if (amminLuogo && sv && st) {
    await prisma.regoleRipartizione.create({ data: { luogoSorgenteId: amminLuogo.id, luogoDestinazioneId: sv.id, percentuale: 50.0, anno: 2026, aziendaId: azienda.id } })
    await prisma.regoleRipartizione.create({ data: { luogoSorgenteId: amminLuogo.id, luogoDestinazioneId: st.id, percentuale: 50.0, anno: 2026, aziendaId: azienda.id } })
  }

  const svLuogo = await prisma.luoghi.findFirst({ where: { nome: 'Santa Venerina', aziendaId: azienda.id } })
  const stLuogo = await prisma.luoghi.findFirst({ where: { nome: 'Stazzo', aziendaId: azienda.id } })
  const apiLuogo = await prisma.luoghi.findFirst({ where: { nome: 'Api', aziendaId: azienda.id } })
  if (svLuogo && stLuogo && apiLuogo && amminLuogo) {
    await prisma.movimentiCassa.createMany({
      data: [
        { data: new Date('2026-01-10'), cassaId: cassaKairos.id, luogoId: svLuogo.id, tipo: 'entrata', tipoMovimento: 'entrata_generica', importo: 2000.00, categoria: 'Vendite', aziendaId: azienda.id },
        { data: new Date('2026-01-15'), cassaId: cassaKairos.id, luogoId: stLuogo.id, tipo: 'entrata', tipoMovimento: 'entrata_generica', importo: 1500.00, categoria: 'Vendite', aziendaId: azienda.id },
        { data: new Date('2026-01-20'), cassaId: cassaKairos.id, luogoId: apiLuogo.id, tipo: 'entrata', tipoMovimento: 'entrata_generica', importo: 800.00, categoria: 'Vendite', aziendaId: azienda.id },
        { data: new Date('2026-02-01'), cassaId: cassaKairos.id, luogoId: amminLuogo.id, tipo: 'uscita', tipoMovimento: 'spesa', importo: 300.00, categoria: 'Spese', aziendaId: azienda.id },
        { data: new Date('2026-02-05'), cassaId: cassaKairos.id, luogoId: svLuogo.id, tipo: 'uscita', tipoMovimento: 'spesa', importo: 150.00, categoria: 'Manutenzione', aziendaId: azienda.id },
      ],
    })
  }

  await prisma.movimentiSoci.createMany({
    data: [
      { data: new Date('2026-01-20'), socioId: giovanni.id, tipo: 'credito', importo: 120.00, categoria: 'materiali', descrizione: 'Anticipo per acquisto reti', aziendaId: azienda.id },
      { data: new Date('2026-01-25'), socioId: maria.id, tipo: 'credito', importo: 50.00, categoria: 'viaggio', descrizione: 'Rimborso km trasferta', aziendaId: azienda.id },
      { data: new Date('2026-02-01'), socioId: giovanni.id, tipo: 'debito', importo: 200.00, categoria: 'anticipo', descrizione: 'Anticipo stipendio Febbraio', aziendaId: azienda.id },
    ],
  })

  await prisma.movimentiInput.createMany({
    data: [
      { data: new Date('2026-01-05'), prodottoId: prodotti['PROD-0001'].id, tipo: 'carico', quantita: 100, unitaMisura: 'kg', note: 'Produzione Millefiori', aziendaId: azienda.id },
      { data: new Date('2026-01-05'), prodottoId: prodotti['PROD-0004'].id, tipo: 'carico', quantita: 50, unitaMisura: 'kg', note: 'Raccolta Avocado', aziendaId: azienda.id },
      { data: new Date('2026-01-10'), prodottoId: prodotti['MAT-0001'].id, tipo: 'carico', quantita: 20, unitaMisura: 'pezzi', note: 'Acquisto arnie nuove', aziendaId: azienda.id },
      { data: new Date('2026-01-10'), prodottoId: prodotti['MAT-0002'].id, tipo: 'carico', quantita: 100, unitaMisura: 'pezzi', note: 'Acquisto telai', aziendaId: azienda.id },
    ],
  })

  console.log('Seed completato!')
  console.log('Azienda: Kairos')
  console.log('Aree lavoro: Agro, Api, Amministrazione, Commerciale, Mista, Servizi')
  console.log('Ruoli: Socio Amministratore, Socio Lavoratore, Resp. Legale, Socio Fondatore, Socio Finanziatore')
  console.log('Materiali api: Arnia, Telaio, Cera, Smielatore')
  console.log('Tariffe: €10/h (€12/h Amm) per socio e area')
  console.log('Luoghi: Santa Venerina, Stazzo, Api, Amministrazione')
  console.log('Credenziali: admin@avaia.it / avaia-demo')
  console.log('Editor:     editor@avaia.it / editor-demo (permessi limitati)')
}

main().catch(console.error).finally(() => prisma.$disconnect())
