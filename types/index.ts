// User types
export interface SpotifyUser {
  display_name?: string;
  images?: { url: string }[];
  email?: string;
}

export interface SpotifyData {
  user: SpotifyUser;
  playlists: any[];
  likedSongs: any[];
  recentlyPlayed?: any[];
}

// Message types
export interface Track {
  name: string;
  artists: { name: string }[];
  uri: string;
}

export interface PlaylistSuggestion {
  name: string;
  description: string;
  tracks: Track[];
}

export interface BaseMessage {
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export interface UserMessage extends BaseMessage {
  type: 'user';
}

export interface BotMessage extends BaseMessage {
  type: 'bot';
  playlistSuggestion?: PlaylistSuggestion;
}

export type Message = UserMessage | BotMessage;

// API Response types
export interface ConversationResponse {
  message: string;
}

export interface PlaylistResponse {
  message: string;
  playlistSuggestion?: PlaylistSuggestion;
}