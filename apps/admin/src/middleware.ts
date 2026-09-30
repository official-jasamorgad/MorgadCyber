import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminSession, COOKIE_NAME } from '@morgad/security'

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value
  if (!token) {
    return NextResponse.redirect(new URL('/MorgadAdmin/login', request.url))
  }
  const session = await verifyAdminSession(token)
  if (!session) {
    const response = NextResponse.redirect(new URL('/MorgadAdmin/login', request.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-admin-id', session.adminId)
  requestHeaders.set('x-admin-role', session.role)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/MorgadAdmin/((?!login$|api/auth|_next/static|_next/image|favicon.ico).*)'],
}
