import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: { signIn: '/login' },
  callbacks: {
    authorized: ({ token }) => !!token,
  },
})

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/anagrafiche/:path*',
    '/vendite/:path*',
    '/listino/:path*',
    '/magazzino/:path*',
    '/contabilita/:path*',
    '/raccolta/:path*',
    '/documenti/:path*',
    '/lavoro-soci/:path*',
    '/liquidazioni-soci/:path*',
    '/utenti/:path*',
    '/scenari/:path*',
    '/statistiche/:path*',
    '/crediti-debiti/:path*',
    '/terreni/:path*',
  ],
}
