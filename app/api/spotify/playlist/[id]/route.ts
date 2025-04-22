import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyApi } from '@/lib/spotify';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get access token from cookies
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Set access token for Spotify API
    spotifyApi.setAccessToken(accessToken);

    // Fetch playlist details
    const playlist = await spotifyApi.getPlaylist(params.id);
    return NextResponse.json(playlist.body);
  } catch (error: any) {
    console.error('Error fetching playlist:', error);
    
    // Check if the error is due to an invalid token
    if (error.statusCode === 401) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch playlist details', details: error.message },
      { status: 500 }
    );
  }
} 