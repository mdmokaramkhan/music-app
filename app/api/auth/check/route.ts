import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { refreshAccessToken, spotifyApi } from '@/lib/spotify';

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get('spotify_access_token')?.value;
  const refreshToken = cookieStore.get('spotify_refresh_token')?.value;

  // If no tokens at all, user is not authenticated
  if (!accessToken && !refreshToken) {
    return NextResponse.json({ isAuthenticated: false });
  }

  // If we have an access token, verify it's still valid
  if (accessToken) {
    try {
      spotifyApi.setAccessToken(accessToken);
      await spotifyApi.getMe(); // Test the token
      return NextResponse.json({
        isAuthenticated: true,
        accessToken
      });
    } catch (error: any) {
      // If token is invalid and we have a refresh token, try to refresh
      if (error.statusCode === 401 && refreshToken) {
        try {
          const { accessToken: newAccessToken, expiresIn } = await refreshAccessToken(refreshToken);
          
          const response = NextResponse.json({ 
            isAuthenticated: true,
            accessToken: newAccessToken
          });

          response.cookies.set('spotify_access_token', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: expiresIn,
          });

          return response;
        } catch (refreshError) {
          // If refresh fails, clear all tokens
          const response = NextResponse.json({ isAuthenticated: false });
          response.cookies.delete('spotify_access_token');
          response.cookies.delete('spotify_refresh_token');
          return response;
        }
      }
    }
  }

  // If we have a refresh token but no access token, try to refresh
  if (!accessToken && refreshToken) {
    try {
      const { accessToken: newAccessToken, expiresIn } = await refreshAccessToken(refreshToken);
      
      const response = NextResponse.json({ 
        isAuthenticated: true,
        accessToken: newAccessToken
      });

      response.cookies.set('spotify_access_token', newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: expiresIn,
      });

      return response;
    } catch (error) {
      // If refresh fails, clear all tokens
      const response = NextResponse.json({ isAuthenticated: false });
      response.cookies.delete('spotify_access_token');
      response.cookies.delete('spotify_refresh_token');
      return response;
    }
  }

  // Default to not authenticated if we reach here
  return NextResponse.json({ isAuthenticated: false });
} 