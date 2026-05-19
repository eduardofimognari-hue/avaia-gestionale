import 'next-auth'

declare module 'next-auth' {
  interface Session {
    aziendaId: number
    ruolo: string
  }

  interface User {
    aziendaId: number
    ruolo: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    aziendaId: number
    ruolo: string
  }
}
