import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { spotifyApi } from '@/lib/spotify';

interface CreatePlaylistRequest {
  name: string;
  description?: string;
  isPublic?: boolean;
  tracks?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const { name, description, isPublic = true, tracks = [] } = await request.json() as CreatePlaylistRequest;

    if (!name) {
      return NextResponse.json(
        { error: 'Playlist name is required' },
        { status: 400 }
      );
    }

    spotifyApi.setAccessToken(accessToken);

    // 1. Get the user ID
    const userResponse = await spotifyApi.getMe();
    const userId = userResponse.body.id;

    // 2. Create the playlist
    const createResponse = await spotifyApi.createPlaylist(userId, {
      name: name,
      description: description || '',
      public: isPublic
    });

    const playlistId = createResponse.body.id;

    // 3. Add tracks if provided
    if (tracks.length > 0) {
      await spotifyApi.addTracksToPlaylist(playlistId, tracks);
    }

    return NextResponse.json({
      success: true,
      playlist: createResponse.body
    });
  } catch (error: any) {
    console.error('Error creating playlist:', error);
    
    let status = 500;
    let message = 'Failed to create playlist';
    
    if (error.statusCode === 401) {
      status = 401;
      message = 'Authentication token expired';
    }
    
    return NextResponse.json(
      { error: message, details: error.message },
      { status }
    );
  }
} 