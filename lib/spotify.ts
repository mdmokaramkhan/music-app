import SpotifyWebApi from 'spotify-web-api-node';

const scopes = [
  'streaming',
  'user-read-email',
  'user-read-private',
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-library-read',
  'playlist-read-private',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-recently-played',
];

export const spotifyApi = new SpotifyWebApi({
  clientId: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID,
  clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  redirectUri: process.env.NEXT_PUBLIC_REDIRECT_URI,
});

export const getAuthUrl = () => {
  const state = Math.random().toString(36).substring(7);
  const clientId = process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_REDIRECT_URI;
  
  return 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
    response_type: 'code',
    client_id: clientId || '',
    scope: scopes.join(' '),
    redirect_uri: redirectUri || '',
    state: state
  }).toString();
};

export const getUserData = async (accessToken: string) => {
  spotifyApi.setAccessToken(accessToken);
  
  try {
    const [userProfile, userPlaylists, likedSongs, recentlyPlayed] = await Promise.all([
      spotifyApi.getMe(),
      spotifyApi.getUserPlaylists(),
      spotifyApi.getMySavedTracks({ limit: 50 }),
      spotifyApi.getMyRecentlyPlayedTracks({ limit: 50 }),
    ]);

    return {
      user: userProfile.body,
      playlists: userPlaylists.body.items,
      likedSongs: likedSongs.body.items.map(item => item.track),
      recentlyPlayed: recentlyPlayed.body.items.map(item => ({
        ...item.track,
        played_at: item.played_at
      })),
    };
  } catch (error) {
    console.error('Error fetching user data:', error);
    throw error;
  }
};

export const exchangeCodeForTokens = async (code: string) => {
  try {
    const data = await spotifyApi.authorizationCodeGrant(code);
    
    return {
      accessToken: data.body.access_token,
      refreshToken: data.body.refresh_token,
      expiresIn: data.body.expires_in,
    };
  } catch (error) {
    console.error('Error exchanging code for tokens:', error);
    throw error;
  }
};

export const refreshAccessToken = async (refreshToken: string) => {
  try {
    spotifyApi.setRefreshToken(refreshToken);
    const data = await spotifyApi.refreshAccessToken();
    
    return {
      accessToken: data.body.access_token,
      expiresIn: data.body.expires_in,
    };
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
};

export async function createPlaylist(userId: string, options: {
  name: string;
  description?: string;
  public?: boolean;
}) {
  try {
    return await spotifyApi.createPlaylist(userId, options);
  } catch (error) {
    console.error('Error creating playlist:', error);
    throw error;
  }
}

export const addTracksToPlaylist = async (accessToken: string, playlistId: string, trackUris: string[]) => {
  spotifyApi.setAccessToken(accessToken);
  
  try {
    // Add tracks to the playlist
    const response = await spotifyApi.addTracksToPlaylist(playlistId, trackUris);
    return response.body;
  } catch (error) {
    console.error('Error adding tracks to playlist:', error);
    throw error;
  }
};

export const searchTracks = async (accessToken: string, query: string, limit: number = 20) => {
  spotifyApi.setAccessToken(accessToken);
  
  try {
    const response = await spotifyApi.searchTracks(query, { limit });
    return response.body.tracks?.items || [];
  } catch (error) {
    console.error('Error searching tracks:', error);
    throw error;
  }
};

export const getRecentlyPlayed = async (accessToken: string, limit: number = 20) => {
  spotifyApi.setAccessToken(accessToken);
  
  try {
    const response = await spotifyApi.getMyRecentlyPlayedTracks({ limit });
    return response.body.items.map(item => ({
      ...item.track,
      played_at: item.played_at
    }));
  } catch (error) {
    console.error('Error fetching recently played tracks:', error);
    throw error;
  }
};