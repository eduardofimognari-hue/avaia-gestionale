# avaia

Gestione multi-aziendale semplice e moderna.

## Moduli

- Dashboard con grafici e statistiche
- Anagrafiche (Prodotti, Clienti, Soci, Aree, Luoghi)
- Listino Prezzi (privato/ingrosso, formati multipli)
- Vendite con righe prodotto
- Magazzino (carichi/scarichi)
- Lavoro Soci (tracciamento ore)
- Cassa (entrate/uscite)
- Debiti Aperti

## Requisiti

- Node.js 18+

## Installazione

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Credenziali di default

- **Email:** admin@kairos.it
- **Password:** admin123

## Tecnologie

- **Next.js 14** (App Router, React Server Components)
- **TypeScript**
- **Prisma** + SQLite
- **Tailwind CSS**
- **NextAuth.js**
- **Recharts**
- **Lucide React**
