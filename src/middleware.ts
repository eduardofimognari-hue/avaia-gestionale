import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/login' },
})

export const config = {
  matcher: ['/dashboard/:path*', '/anagrafiche/:path*', '/vendite/:path*', '/listino/:path*', '/magazzino/:path*', '/contabilita/:path*', '/raccolta/:path*', '/documenti/:path*', '/lavoro-soci/:path*', '/cassa/:path*', '/movimenti-soci/:path*', '/liquidazioni-soci/:path*', '/debiti/:path*', '/utenti/:path*'],
}
