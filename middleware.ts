import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { refreshAccessToken } from './lib/spotify';

export async function middleware(request: NextRequest) {
  // Only run this middleware for API routes that need Spotify authentication
  if (!request.nextUrl.pathname.startsWith('/api/spotify')) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('spotify_access_token')?.value;
  const refreshToken = request.cookies.get('spotify_refresh_token')?.value;

  // If no refresh token, user needs to login
  if (!refreshToken) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // If no access token but we have refresh token, try to refresh
  if (!accessToken && refreshToken) {
    try {
      const { accessToken: newAccessToken, expiresIn } = await refreshAccessToken(refreshToken);
      
      const response = NextResponse.next();
      
      response.cookies.set('spotify_access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: expiresIn,
      });

      return response;
    } catch (error) {
      // If refresh fails, clear all tokens
      const response = NextResponse.json(
        { error: 'Failed to refresh token' },
        { status: 401 }
      );
      response.cookies.delete('spotify_access_token');
      response.cookies.delete('spotify_refresh_token');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/spotify/:path*',
}; 