import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateConversationResponse, generatePlaylistSuggestion } from '@/lib/gemini';
import { searchTracks } from '@/lib/spotify';
import { PlaylistResponse, ConversationResponse, Track } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { message, isPlaylistRequest = false } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get access token from cookies for potential Spotify API calls
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('spotify_access_token')?.value;

    if (isPlaylistRequest) {
      // Handle playlist creation request
      const response = await generatePlaylistSuggestion(message, accessToken || undefined);
      
      // If we have access token, we could refine the results with real Spotify tracks
      if (accessToken && response.playlistSuggestion) {
        try {
          // For each track in the suggestion, try to find a real track on Spotify
          const enhancedTracks = await Promise.all(
            response.playlistSuggestion.tracks.map(async (track) => {
              const searchQuery = `${track.name} ${track.artists.map(a => a.name).join(' ')}`;
              const results = await searchTracks(accessToken, searchQuery, 1);
              
              if (results && results.length > 0) {
                // Return the real Spotify track
                const spotifyTrack: Track = {
                  name: results[0].name,
                  artists: results[0].artists.map(artist => ({ name: artist.name })),
                  uri: results[0].uri
                };
                return spotifyTrack;
              }
              
              // Fall back to the AI suggestion if no match found
              return track;
            })
          );
          
          // Update the tracks with real ones from Spotify
          response.playlistSuggestion.tracks = enhancedTracks;
        } catch (error) {
          console.error('Error refining tracks with Spotify API:', error);
          // Continue with the AI-generated tracks if there's an error
        }
      }
      
      const playlistResponse: PlaylistResponse = {
        message: response.message,
        playlistSuggestion: response.playlistSuggestion
      };
      
      return NextResponse.json(playlistResponse);
    } else {
      // Handle regular conversation
      const responseText = await generateConversationResponse(message);
      
      const conversationResponse: ConversationResponse = {
        message: responseText
      };
      
      return NextResponse.json(conversationResponse);
    }
  } catch (error) {
    console.error('Error in AI chat API:', error);
    return NextResponse.json(
      { error: 'Failed to process your request' },
      { status: 500 }
    );
  }
} 