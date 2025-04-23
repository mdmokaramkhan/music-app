"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  Music, 
  Loader2, 
  Library, 
  Heart, 
  Plus, 
  Send, 
  LogOut, 
  User, 
  MessageSquare, 
  Play, 
  Pause,
  Search,
  ListMusic,
  Settings,
  ChevronLeft,
  Menu,
  X,
  Home as HomeIcon,
  LayoutDashboard,
  PlusCircle,
  Clock,
  Sparkles,
  Disc3,
  Volume2,
  SkipForward,
  SkipBack,
  Download
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState, useRef } from "react";
import { getAuthUrl, getUserData } from "@/lib/spotify";
import { useSearchParams } from "next/navigation";
import PlaylistView from "@/components/PlaylistView";
import SpotifyPlayer from "@/components/SpotifyPlayer";
import { Message, SpotifyData, SpotifyUser, PlaylistResponse, ConversationResponse } from "@/types";

const welcomeMessage: Message = {
  type: 'bot',
  content: "Hi! I'm your personal playlist curator. I can help you create the perfect playlist based on your mood, activity, or any specific vibe you're looking for. How are you feeling today?",
  timestamp: new Date()
};

const moodCategories = [
  { name: "Energetic", description: "Upbeat and lively tracks", color: "from-orange-500 to-red-500", icon: "🔥" },
  { name: "Chill", description: "Relaxing and peaceful vibes", color: "from-blue-500 to-cyan-500", icon: "🌊" },
  { name: "Focus", description: "Concentration enhancing music", color: "from-purple-500 to-indigo-500", icon: "🎯" },
  { name: "Party", description: "Dance and celebration tracks", color: "from-pink-500 to-rose-500", icon: "🎉" },
  { name: "Workout", description: "High-energy motivation beats", color: "from-green-500 to-emerald-500", icon: "💪" },
];

export default function Home() {
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [spotifyData, setSpotifyData] = useState<SpotifyData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [selectedPlaylist, setSelectedPlaylist] = useState<any>(null);
  const [playbackToken, setPlaybackToken] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'dashboard' | 'explore' | 'chat' | 'playlists' | 'liked' | 'recent'>('dashboard');
  const [currentTrack, setCurrentTrack] = useState<any>(null);

  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [playlistToShow, setPlaylistToShow] = useState<'recent' | 'featured' | 'recommended'>('recent');
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlistDescription, setPlaylistDescription] = useState('');
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false);
  const [createPlaylistError, setCreatePlaylistError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setError(error);
      return;
    }

    // Check if we have an access token in cookies
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        
        if (data.isAuthenticated) {
          setIsAuthenticated(true);
          // Fetch user data
          const userData = await getUserData(data.accessToken);
          setSpotifyData(userData);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
      }
    };

    checkAuth();

    const getPlaybackToken = async () => {
      try {
        const response = await fetch('/api/auth/check');
        const data = await response.json();
        if (data.isAuthenticated) {
          setPlaybackToken(data.accessToken);
        }
      } catch (error) {
        console.error('Error getting playback token:', error);
      }
    };

    getPlaybackToken();
  }, [searchParams]);

  const handleSpotifyLogin = async () => {
    setIsLoading(true);
    try {
      const authUrl = getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Authentication error:', error);
      setError('Failed to initialize Spotify login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/';
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  // Function to handle playing a playlist in Spotify
  const handlePlayPlaylist = (e: React.MouseEvent, playlistId: string) => {
    e.stopPropagation(); // Prevent triggering the playlist click event
    // Open Spotify with the playlist
    window.open(`https://open.spotify.com/playlist/${playlistId}`, '_blank');
  };

  const handlePlaylistClick = async (playlist: any) => {
    try {
      const response = await fetch(`/api/spotify/playlist/${playlist.id}`);
      const data = await response.json();
      setSelectedPlaylist(data);
      // No longer navigating to a different view, just showing content in the right panel
    } catch (error) {
      console.error('Error fetching playlist details:', error);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsTyping(true);

    // Check if it's a playlist creation request
    const isPlaylistRequest = 
      inputMessage.toLowerCase().includes('playlist') || 
      inputMessage.toLowerCase().includes('songs for') ||
      inputMessage.toLowerCase().includes('music for');

    try {
      // Call our new AI API endpoint
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          isPlaylistRequest,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get AI response');
      }

      const data = await response.json();
      
      let botMessage: Message;
      
      if (isPlaylistRequest && 'playlistSuggestion' in data && data.playlistSuggestion) {
        const playlistData = data as PlaylistResponse;
        botMessage = {
          type: 'bot',
          content: playlistData.message || 'I created a playlist based on your request.',
          timestamp: new Date(),
          playlistSuggestion: playlistData.playlistSuggestion
        };
      } else {
        // Normal conversation
        const conversationData = data as ConversationResponse;
        botMessage = {
          type: 'bot',
          content: conversationData.message || "I'm not sure how to respond to that.",
          timestamp: new Date()
        };
      }
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);
      // Fallback error message
      const errorMessage: Message = {
        type: 'bot',
        content: "I'm having trouble processing your request right now. Please try again later.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const createPlaylistFromSuggestion = async (suggestion: any) => {
    if (!playbackToken) return;
    
    setIsCreatingPlaylist(true);
    
    try {
      // Get track URIs (in real app you'd search Spotify for these tracks)
      const trackIds = suggestion.tracks.map((track: any) => track.uri);
      
      // Create the playlist via API
      const response = await fetch('/api/spotify/playlist/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: suggestion.name,
          description: suggestion.description,
          isPublic: true,
          tracks: trackIds
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create playlist');
      }

      // Add a confirmation message
      const confirmationMessage: Message = {
        type: 'bot',
        content: `Great! I've created and saved the "${suggestion.name}" playlist to your Spotify account. You can find it in your library.`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, confirmationMessage]);
      
      // Refresh playlists
      const userData = await getUserData(playbackToken);
      setSpotifyData(userData);
      
    } catch (error: any) {
      console.error('Error creating playlist from suggestion:', error);
      
      // Add error message
      const errorMessage: Message = {
        type: 'bot',
        content: `Sorry, I couldn't create the playlist. ${error.message || 'Please try again.'}`,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  // Helper functions for playlist creation
  const getPlaylistNameFromRequest = (request: string) => {
    // Extract a name from the user request (in a real app, this would be more sophisticated)
    if (request.toLowerCase().includes('workout')) return 'Workout Energy Boost';
    if (request.toLowerCase().includes('relax')) return 'Relaxing Moments';
    if (request.toLowerCase().includes('focus')) return 'Deep Focus';
    if (request.toLowerCase().includes('party')) return 'Party Essentials';
    
    // Default name
    return 'Your Custom Playlist';
  };

  const getSampleTracks = (type: string) => {
    // These would be replaced with actual search results in a real implementation
    const trackSets: Record<string, any[]> = {
      workout: [
        { name: 'Eye of the Tiger', artists: [{ name: 'Survivor' }], uri: 'spotify:track:2KH16WveTQWT6KOG9Rg6e2' },
        { name: 'Don\'t Stop Me Now', artists: [{ name: 'Queen' }], uri: 'spotify:track:7hQJA50XrCWABAu5v6QZ4i' },
        { name: 'Stronger', artists: [{ name: 'Kanye West' }], uri: 'spotify:track:4fzsfWzRhPawzqhX8Qt9F3' }
      ],
      relaxing: [
        { name: 'Weightless', artists: [{ name: 'Marconi Union' }], uri: 'spotify:track:0EtMoaITWEU2YNqxpfnFQO' },
        { name: 'Claire de Lune', artists: [{ name: 'Claude Debussy' }], uri: 'spotify:track:0A55pY8c8BBBgEVpYK7Z8s' },
        { name: 'Something About Us', artists: [{ name: 'Daft Punk' }], uri: 'spotify:track:1NeLwFETswx8Fzxl2AFl91' }
      ],
      focus: [
        { name: 'Experience', artists: [{ name: 'Ludovico Einaudi' }], uri: 'spotify:track:1BncfTJAWxrsxyT9culBrj' },
        { name: 'The Theory of Everything', artists: [{ name: 'Johann Johannsson' }], uri: 'spotify:track:5mDvh55S7SliEC8m2RNtye' },
        { name: 'Time', artists: [{ name: 'Hans Zimmer' }], uri: 'spotify:track:6ZFbXIJkudc8sYlB7GNzxK' }
      ],
      party: [
        { name: 'Uptown Funk', artists: [{ name: 'Mark Ronson' }, { name: 'Bruno Mars' }], uri: 'spotify:track:32OlwWuMpZ6b0aN2RZOeMS' },
        { name: 'Get Lucky', artists: [{ name: 'Daft Punk' }, { name: 'Pharrell Williams' }], uri: 'spotify:track:69kOkLUCkxIZYexIgSG8rq' },
        { name: 'Can\'t Stop the Feeling!', artists: [{ name: 'Justin Timberlake' }], uri: 'spotify:track:1WkMMavIMc4JZ8cfMmxHkI' }
      ],
      custom: [
        { name: 'Bohemian Rhapsody', artists: [{ name: 'Queen' }], uri: 'spotify:track:3z8h0TU7ReDPLIbEnYhWZb' },
        { name: 'Billie Jean', artists: [{ name: 'Michael Jackson' }], uri: 'spotify:track:5ChkMS8OtdzJeqyybCc9R5' },
        { name: 'Imagine', artists: [{ name: 'John Lennon' }], uri: 'spotify:track:7pKfPomDEeI4TPT6EOYjn9' }
      ]
    };
    
    return trackSets[type] || trackSets.custom;
  };

  const handlePlayTrack = (track: any) => {
    setCurrentTrack(track);
    // TODO: Implement actual playback
  };

  // New functions for playlist creation
  const handleCreatePlaylist = () => {
    setPlaylistName('');
    setPlaylistDescription('');
    setCreatePlaylistError(null);
    setIsPublic(true);
    setShowCreatePlaylistModal(true);
  };
  
  const handleCreateFromChat = () => {
    setActiveSection('chat');
    setInputMessage("Create a playlist based on");
  };

  // Format track duration from milliseconds to MM:SS format
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const submitPlaylistCreation = async () => {
    if (!playlistName.trim()) {
      setCreatePlaylistError('Please enter a playlist name');
      return;
    }

    setIsCreatingPlaylist(true);
    setCreatePlaylistError(null);

    try {
      const response = await fetch('/api/spotify/playlist/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: playlistName,
          description: playlistDescription,
          isPublic,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create playlist');
      }

      // Close modal and refresh playlists
      setShowCreatePlaylistModal(false);
      
      // Refresh the user data to show the new playlist
      if (playbackToken) {
        const userData = await getUserData(playbackToken);
        setSpotifyData(userData);
      }
      
      // Navigate to playlists section and show success message
      setActiveSection('playlists');
      
      // Show the newly created playlist
      handlePlaylistClick(data.playlist);
      
    } catch (error: any) {
      console.error('Error creating playlist:', error);
      setCreatePlaylistError(error.message || 'Failed to create playlist');
    } finally {
      setIsCreatingPlaylist(false);
    }
  };

  if (!isAuthenticated) {
  return (
      <div className="min-h-screen bg-gradient-to-b from-background to-secondary flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center space-y-8 max-w-3xl px-6"
        >
          {isLoading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <Image
                    src="/spotify-logo.svg"
                    alt="Spotify"
                    width={28}
                    height={28}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-7 h-7"
                  />
                </div>
                <h2 className="text-2xl font-semibold">Connecting to Spotify</h2>
                <p className="text-muted-foreground">Please wait while we redirect you to Spotify...</p>
              </div>
            </motion.div>
          ) : (
            <>
              <div className="flex items-center justify-center gap-2 mb-8">
                <Music className="w-16 h-16 text-primary" />
                <h1 className="text-5xl md:text-7xl font-bold">
                  Playlist Curator
                </h1>
              </div>
              <p className="text-xl md:text-3xl text-muted-foreground leading-relaxed">
                Transform your music experience with AI-powered playlist curation. 
                Connect your Spotify account to get started.
              </p>
              
              <div className="space-y-4">
                {error && (
                  <div className="text-red-500 bg-red-500/10 p-4 rounded-lg">
                    {error}
                  </div>
                )}
                <button
                  onClick={handleSpotifyLogin}
                  disabled={isLoading}
                  className="inline-flex items-center gap-3 bg-[#1DB954] text-white px-8 py-4 rounded-full font-semibold hover:bg-[#1ed760] transition-colors disabled:opacity-70 text-lg"
          >
            <Image
                    src="/spotify-logo.svg"
                    alt="Spotify"
                    width={28}
                    height={28}
                    className="w-7 h-7"
                  />
                  Connect with Spotify
                </button>
                <p className="text-sm text-muted-foreground">
                  We'll only access your playlists and liked songs
                </p>
                <p className="text-sm text-muted-foreground">
                  By Mohammad Mokaram Khan (12304634) & Jasleen Kaur (12303880)
                </p>
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Top Header Bar */}
      <header className="h-16 border-b border-border flex items-center justify-between px-4 fixed top-0 left-0 right-0 bg-background/80 backdrop-blur-md z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowMobileMenu(true)}
            className="lg:hidden p-2 rounded-full hover:bg-muted transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <Music className="w-7 h-7 text-primary" />
            <h1 className="text-xl font-bold hidden md:block">Playlist Curator</h1>
          </div>
        </div>
        
        <div className="relative w-full max-w-md mx-4 hidden md:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search songs, artists, or playlists..."
            className="w-full bg-muted rounded-full h-9 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleCreatePlaylist}
            className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors hidden sm:flex"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Playlist</span>
          </button>
          
          <div className="relative">
            <button className="flex items-center gap-2 rounded-full hover:bg-muted p-1 transition-colors">
              <div className="w-8 h-8 rounded-full overflow-hidden bg-primary/10">
                {spotifyData?.user?.images?.[0]?.url ? (
                  <Image
                    src={spotifyData.user.images[0].url}
                    alt={spotifyData.user.display_name || 'User'}
                    width={32}
                    height={32}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex h-[calc(100vh-16px)] pt-16">
        {/* Sidebar */}
        <aside className="w-64 border-r border-border hidden lg:block p-4 shrink-0">
          <nav className="space-y-1 mb-8">
            <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider px-3 mb-2">Main</h3>
            {[
              { icon: LayoutDashboard, label: 'Dashboard', section: 'dashboard' },
              { icon: MessageSquare, label: 'AI Assistant', section: 'chat' },
              { icon: Sparkles, label: 'Explore', section: 'explore' },
            ].map((item) => (
              <button
                key={item.section}
                onClick={() => setActiveSection(item.section as any)}
                className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors ${
                  activeSection === item.section 
                    ? 'bg-primary/10 text-primary' 
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
            
            <h3 className="text-xs uppercase text-muted-foreground font-semibold tracking-wider px-3 mt-6 mb-2">Your Library</h3>
            {[
              { icon: Library, label: 'Playlists', section: 'playlists' },
              { icon: Heart, label: 'Liked Songs', section: 'liked' },
              { icon: Clock, label: 'Recently Played', section: 'recent' },
            ].map((item) => (
              <button
                key={item.section}
                onClick={() => setActiveSection(item.section as any)}
                className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors ${
                  activeSection === item.section 
                    ? 'bg-primary/10 text-primary' 
                    : 'hover:bg-muted text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
          
          <div className="border-t border-border pt-4 mt-auto">
            <div className="bg-muted/50 rounded-xl p-4">
              <h4 className="font-medium text-sm mb-2">Create a playlist with AI</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Let our assistant create the perfect playlist for your mood or activity.
              </p>
              <button
                onClick={handleCreateFromChat}
                className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Get Started
              </button>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mt-6 text-sm w-full"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile Menu */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ ease: 'easeInOut', duration: 0.3 }}
              className="fixed inset-0 z-50 lg:hidden"
            >
              <div className="absolute inset-0 bg-background/80 backdrop-blur-lg" onClick={() => setShowMobileMenu(false)} />
              <nav className="absolute left-0 top-0 bottom-0 w-[280px] max-w-full bg-background border-r border-border p-6 shadow-xl flex flex-col">
                {/* Mobile menu content, similar to sidebar but simplified */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <Music className="w-6 h-6 text-primary" />
                    <h1 className="font-bold text-xl">Curator</h1>
                  </div>
                  <button 
                    onClick={() => setShowMobileMenu(false)}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="mb-4">
                  <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Search..."
                      className="w-full bg-muted rounded-lg h-10 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  
                  <nav className="space-y-1">
                    {[
                      { icon: LayoutDashboard, label: 'Dashboard', section: 'dashboard' },
                      { icon: MessageSquare, label: 'AI Assistant', section: 'chat' },
                      { icon: Sparkles, label: 'Explore', section: 'explore' },
                      { icon: Library, label: 'Playlists', section: 'playlists' },
                      { icon: Heart, label: 'Liked Songs', section: 'liked' },
                    ].map((item) => (
                      <button
                        key={item.section}
                        onClick={() => {
                          setActiveSection(item.section as any);
                          setShowMobileMenu(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-md transition-colors ${
                          activeSection === item.section 
                            ? 'bg-primary/10 text-primary' 
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="font-medium">{item.label}</span>
                      </button>
                    ))}
                  </nav>
                </div>
                
                <div className="mt-auto pt-4 border-t border-border">
                  <button
                    onClick={handleCreateFromChat}
                    className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium hover:bg-primary/90 transition-colors mb-4"
                  >
                    Create with AI
                  </button>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm w-full p-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto pb-24">
          <div className="p-6">
            {/* Dashboard View */}
            {activeSection === 'dashboard' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-8"
              >
                {/* Hero Banner */}
                <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 p-8 shadow-lg">
                  <div className="absolute inset-0 bg-[url('/wave-pattern.svg')] opacity-10 mix-blend-overlay"></div>
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="relative z-10 max-w-xl"
                  >
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">
                      Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}, 
                      <span className="bg-white/20 rounded-lg px-2 py-0.5 ml-2">{spotifyData?.user?.display_name?.split(' ')[0] || 'there'}</span>!
                    </h2>
                    <p className="text-white/90 text-lg mb-6">What do you feel like listening to today?</p>
                    <div className="flex flex-wrap gap-3">
                      <button 
                        onClick={handleCreateFromChat}
                        className="bg-white/90 hover:bg-white text-indigo-700 font-medium px-5 py-2.5 rounded-full transition-colors flex items-center gap-2 shadow-md"
                      >
                        <Sparkles className="w-5 h-5" />
                        Create with AI
                      </button>
                      <button 
                        onClick={() => setActiveSection('playlists')}
                        className="bg-white/20 hover:bg-white/30 text-white font-medium px-5 py-2.5 rounded-full transition-colors flex items-center gap-2"
                      >
                        <Library className="w-5 h-5" />
                        Your Playlists
                      </button>
                    </div>
                  </motion.div>
                  
                  <div className="hidden md:block absolute -bottom-6 -right-6 w-72 h-72 bg-indigo-500/30 rounded-full blur-3xl"></div>
                  <div className="hidden md:block absolute -top-20 right-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl"></div>
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <motion.div 
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-xl p-6 shadow-sm border border-purple-200/30 dark:border-purple-700/30 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-500 ease-out"></div>
                    <div className="absolute bottom-0 right-0 w-16 h-16 bg-purple-500/20 rounded-full translate-x-4 translate-y-4"></div>
                    
                    <div className="flex items-center gap-4 relative">
                      <div className="w-14 h-14 rounded-xl bg-purple-500/20 dark:bg-purple-500/30 flex items-center justify-center">
                        <Library className="w-7 h-7 text-purple-600 dark:text-purple-300" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-bold text-purple-700 dark:text-purple-300">{spotifyData?.playlists?.length || 0}</h4>
                        <p className="text-sm text-purple-600/70 dark:text-purple-400 font-medium">Your Playlists</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 rounded-xl p-6 shadow-sm border border-pink-200/30 dark:border-pink-700/30 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/10 rounded-full translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-500 ease-out"></div>
                    <div className="absolute bottom-0 right-0 w-16 h-16 bg-pink-500/20 rounded-full translate-x-4 translate-y-4"></div>
                    
                    <div className="flex items-center gap-4 relative">
                      <div className="w-14 h-14 rounded-xl bg-pink-500/20 dark:bg-pink-500/30 flex items-center justify-center">
                        <Heart className="w-7 h-7 text-pink-600 dark:text-pink-300" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-bold text-pink-700 dark:text-pink-300">{spotifyData?.likedSongs?.length || 0}</h4>
                        <p className="text-sm text-pink-600/70 dark:text-pink-400 font-medium">Liked Songs</p>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div 
                    whileHover={{ y: -5, transition: { duration: 0.2 } }}
                    className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-xl p-6 shadow-sm border border-emerald-200/30 dark:border-emerald-700/30 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full translate-x-8 -translate-y-8 group-hover:scale-125 transition-transform duration-500 ease-out"></div>
                    <div className="absolute bottom-0 right-0 w-16 h-16 bg-emerald-500/20 rounded-full translate-x-4 translate-y-4"></div>
                    
                    <div className="flex items-center gap-4 relative">
                      <div className="w-14 h-14 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center">
                        <Sparkles className="w-7 h-7 text-emerald-600 dark:text-emerald-300" />
                      </div>
                      <div>
                        <h4 className="text-3xl font-bold text-emerald-700 dark:text-emerald-300">{moodCategories.length}</h4>
                        <p className="text-sm text-emerald-600/70 dark:text-emerald-400 font-medium">Available Moods</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
                
                {/* Quick Access */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recently Added */}
                  <div className="bg-card rounded-xl shadow-sm p-6 border border-border/50">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Disc3 className="w-5 h-5 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold">Recently Added</h3>
                      </div>
                      <button 
                        onClick={() => setActiveSection('playlists')}
                        className="text-sm text-primary hover:underline font-medium flex items-center gap-1"
                      >
                        See All
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {spotifyData?.playlists?.slice(0, 3).map((playlist: any) => (
                        <motion.div
                          key={playlist.id}
                          whileHover={{ y: -3, transition: { duration: 0.2 } }}
                          className="group relative rounded-xl overflow-hidden bg-muted/40 shadow-sm border border-border/50"
                          onClick={() => handlePlaylistClick(playlist)}
                        >
                          <div className="aspect-square relative">
                            {playlist.images?.[0]?.url ? (
                              <Image
                                src={playlist.images[0].url}
                                alt={playlist.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                                <Music className="w-12 h-12 text-primary" />
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <div 
                                className="rounded-full bg-primary p-3 shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200"
                                onClick={(e) => handlePlayPlaylist(e, playlist.id)}
                              >
                                <Play className="w-5 h-5 text-primary-foreground" />
                              </div>
                            </div>
                          </div>
                          <div className="p-3">
                            <h4 className="font-medium truncate">{playlist.name}</h4>
                            <p className="text-xs text-muted-foreground truncate">{playlist.tracks.total} tracks</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                
                  {/* Personalized Recommendation */}
                  <div className="bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-900/40 dark:to-orange-800/40 rounded-xl p-6 shadow-sm border border-amber-200/50 dark:border-amber-700/30 flex flex-col justify-between">
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-2">Daily Mix for You</h3>
                      <p className="text-amber-800/70 dark:text-amber-200/70 text-sm">
                        Fresh tracks based on your recent listening, updated daily
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4">
                      <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-white/70 shadow-md">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-amber-600"></div>
                        <Volume2 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-white w-10 h-10" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-amber-900 dark:text-amber-100">Your Daily Mix</h4>
                        <p className="text-sm text-amber-800/70 dark:text-amber-200/70 mb-3">30 tracks • Updated today</p>
                        <button className="bg-amber-800 hover:bg-amber-900 text-white text-sm font-medium py-1.5 px-4 rounded-full shadow-sm transition-colors">
                          Listen Now
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Mood Based Recommendations */}
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">Mood Based Playlists</h3>
                      <p className="text-sm text-muted-foreground">Create personalized playlists based on your mood</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    {moodCategories.map((mood) => (
                      <motion.button
                        key={mood.name}
                        whileHover={{ y: -5, scale: 1.03 }}
                        transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        onClick={() => {
                          setInputMessage(`Create a playlist for when I'm feeling ${mood.name.toLowerCase()}`);
                          setActiveSection('chat');
                        }}
                        className={`relative rounded-xl overflow-hidden bg-gradient-to-r ${mood.color} p-6 text-white text-left group h-36 flex flex-col justify-between shadow-md`}
                      >
                        <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full translate-x-8 -translate-y-8"></div>
                        <div className="absolute bottom-0 right-0 w-12 h-12 bg-white/10 rounded-full translate-x-4 translate-y-4"></div>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{mood.icon}</span>
                          <h4 className="text-xl font-semibold">{mood.name}</h4>
                        </div>
                        <div>
                          <p className="text-sm text-white/80 mb-3">{mood.description}</p>
                          <div className="absolute right-4 bottom-4 bg-white/20 rounded-full p-2 transform translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
                            <Play className="w-4 h-4 text-white" />
                          </div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* AI Chat View */}
            {activeSection === 'chat' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-[calc(100vh-158px)] flex flex-col"
              >
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 h-full">
                  {/* Left Side - Assistant, Templates & History */}
                  <div className="md:col-span-2 flex flex-col gap-6 overflow-y-auto pb-6">
                    {/* AI Music Assistant Header */}
                    <div className="relative bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-2xl p-6 shadow-md overflow-hidden">
                      <div className="absolute inset-0 bg-[url('/wave-pattern.svg')] opacity-10 mix-blend-overlay"></div>
                      <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                      
                      <div className="flex items-start gap-5 relative z-10">
                        <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md p-3 shadow-xl flex items-center justify-center">
                          <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        
                        <div className="flex-1">
                          <h2 className="text-2xl font-bold text-white mb-1">AI Music Assistant</h2>
                          <p className="text-white/90 text-sm mb-3 max-w-xl">
                            Ask me to create personalized playlists based on any mood, activity, genre, or specific artist you enjoy. I can also answer music-related questions!
                          </p>
                          
                          <div className="flex flex-wrap gap-2">
                            {["🎵 Custom playlists", "🎧 Music discovery", "🔍 Artist recommendations"].map((feature) => (
                              <span key={feature} className="bg-white/20 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-full">
                                {feature}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Templates */}
                    <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border/50">
                      <div className="p-4 border-b border-border">
                        <h3 className="font-medium flex items-center gap-2">
                          <PlusCircle className="w-4 h-4 text-primary" /> 
                          <span>Playlist Templates</span>
                        </h3>
                      </div>
                      
                      <div className="p-4 grid grid-cols-2 gap-3">
                        {[
                          { name: "Workout Mix", desc: "Energetic tracks for your exercise routine", color: "from-red-500 to-orange-500", emoji: "💪" },
                          { name: "Chill Evening", desc: "Relaxing tunes to unwind", color: "from-blue-500 to-indigo-500", emoji: "🌙" },
                          { name: "Deep Focus", desc: "Concentration-enhancing music", color: "from-emerald-500 to-teal-500", emoji: "🧠" },
                          { name: "Feel Good", desc: "Uplifting songs to boost your mood", color: "from-amber-500 to-yellow-500", emoji: "😊" },
                          { name: "Dinner Party", desc: "Perfect background music for hosting", color: "from-fuchsia-500 to-pink-500", emoji: "🍷" },
                          { name: "Road Trip", desc: "Driving anthems for your journey", color: "from-violet-500 to-purple-500", emoji: "🚗" }
                        ].map((template) => (
                          <motion.button
                            key={template.name}
                            whileHover={{ y: -4 }}
                            onClick={() => setInputMessage(`Create a ${template.name} playlist with songs that are perfect for ${template.desc.toLowerCase()}`)}
                            className={`p-3 rounded-lg bg-gradient-to-r ${template.color} text-white text-left flex flex-col h-24 justify-between shadow-sm relative overflow-hidden`}
                          >
                            <div className="absolute top-2 right-2 opacity-30 text-xl">{template.emoji}</div>
                            <span className="font-medium truncate">{template.name}</span>
                            <span className="text-xs text-white/80 line-clamp-2">{template.desc}</span>
                            <div className="flex justify-end items-center gap-1 mt-1">
                              <span className="text-xs">Try it</span>
                              <ChevronLeft className="w-3 h-3 rotate-180" />
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Your History */}
                    <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border/50">
                      <div className="p-4 border-b border-border">
                        <h3 className="font-medium flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" /> 
                          <span>Recent Creations</span>
                        </h3>
                      </div>
                      
                      <div className="divide-y divide-border/50">
                        {messages.filter(msg => 'playlistSuggestion' in msg && msg.playlistSuggestion).slice(0, 5).map((msg, i) => (
                          <button
                            key={i}
                            onClick={() => {
                              // Scroll to this message
                              const msgElements = document.querySelectorAll('.chat-message');
                              const targetElement = Array.from(msgElements).find(el => 
                                el.textContent?.includes(msg.playlistSuggestion?.name || '')
                              );
                              if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="p-3 w-full text-left hover:bg-muted/50 flex items-center gap-3 transition-colors"
                          >
                            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Music className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{msg.playlistSuggestion?.name}</p>
                              <p className="text-xs text-muted-foreground truncate">{msg.playlistSuggestion?.tracks.length} tracks</p>
                            </div>
                          </button>
                        ))}
                        
                        {messages.filter(msg => 'playlistSuggestion' in msg).length === 0 && (
                          <div className="p-6 text-center">
                            <div className="w-12 h-12 rounded-full bg-muted/50 mx-auto mb-3 flex items-center justify-center">
                              <PlusCircle className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <h4 className="text-sm font-medium mb-1">No created playlists yet</h4>
                            <p className="text-xs text-muted-foreground">
                              Your AI-generated playlists will appear here
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Spotify Attribution - Bottom Left */}
                    <div className="flex items-center justify-center">
                      <button
                        onClick={() => window.open('https://spotify.com', '_blank')}
                        className="bg-[#1DB954]/90 hover:bg-[#1DB954] transition-colors text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-1 shadow-sm"
                      >
                        <Image
                          src="/spotify-logo.svg"
                          alt="Spotify"
                          width={14}
                          height={14}
                          className="w-3 h-3"
                        />
                        <span>Powered by Spotify</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Right Side - Chat */}
                  <div className="md:col-span-3 bg-card rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 border border-border/50 relative">
                    {/* Tabs */}
                    <div className="flex items-center px-4 pt-2 border-b border-border">
                      <div className="flex gap-1 -mb-px">
                        <button className="px-4 py-2 border-b-2 border-primary text-primary font-medium text-sm">
                          Chat
                        </button>
                        <button className="px-4 py-2 border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors text-sm">
                          History
                        </button>
                      </div>
                    </div>
                    
                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto pt-4 px-6 pb-2 space-y-4">
                      {messages.map((message, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} chat-message`}
                        >
                          <div className={`flex gap-3 max-w-[80%] ${message.type === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                              {message.type === 'user' ? (
                                spotifyData?.user?.images?.[0]?.url ? (
                                  <Image
                                    src={spotifyData.user.images[0].url}
                                    alt={spotifyData.user.display_name || 'User'}
                                    width={32}
                                    height={32}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-primary/10">
                                    <User className="w-4 h-4 text-primary" />
                                  </div>
                                )
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-500">
                                  <Sparkles className="w-4 h-4 text-white" />
                                </div>
                              )}
                            </div>
                            <div className={`rounded-2xl px-4 py-3 ${
                              message.type === 'user'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card border border-border shadow-sm'
                            }`}>
                              <p className="text-sm whitespace-pre-line">{message.content}</p>
                              <p className="text-[10px] opacity-70 mt-1">
                                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                              
                              {/* Playlist Suggestion - Redesigned */}
                              {'playlistSuggestion' in message && message.playlistSuggestion && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 5 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.3 }}
                                  className="mt-3 pt-3 border-t border-border"
                                >
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-medium text-primary flex items-center gap-1">
                                      <Music className="w-3 h-3" /> 
                                      Playlist Suggestion
                                    </h4>
                                    <span className="text-xs text-muted-foreground">{message.playlistSuggestion.tracks.length} tracks</span>
                                  </div>
                                  
                                  <div className="bg-muted/40 rounded-lg overflow-hidden">
                                    <div className="p-3">
                                      <div className="flex items-center gap-3 mb-3">
                                        <div className="w-12 h-12 rounded-md bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
                                          <Music className="w-6 h-6 text-primary/70" />
                                        </div>
                                        <div>
                                          <h5 className="font-medium text-sm">{message.playlistSuggestion.name}</h5>
                                          <p className="text-xs text-muted-foreground line-clamp-1">{message.playlistSuggestion.description}</p>
                                        </div>
                                      </div>
                                      
                                      {/* Track Preview */}
                                      <div className="space-y-1 max-h-36 overflow-y-auto mb-3 bg-card/80 rounded-md p-2">
                                        {message.playlistSuggestion.tracks.slice(0, 5).map((track: any, i: number) => (
                                          <div key={i} className="flex items-center text-xs px-1 py-1 rounded hover:bg-muted/50 transition-colors">
                                            <span className="w-4 text-xs text-muted-foreground">{i+1}</span>
                                            <Music className="w-3 h-3 text-muted-foreground mx-2" />
                                            <div className="flex-1 min-w-0">
                                              <p className="font-medium truncate">{track.name}</p>
                                              <p className="text-muted-foreground truncate">{track.artists.map((a: any) => a.name).join(', ')}</p>
                                            </div>
                                          </div>
                                        ))}
                                        
                                        {message.playlistSuggestion.tracks.length > 5 && (
                                          <button className="text-xs text-primary hover:underline w-full text-center pt-1">
                                            +{message.playlistSuggestion.tracks.length - 5} more tracks
                                          </button>
                                        )}
                                      </div>
                                      
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => createPlaylistFromSuggestion(message.playlistSuggestion)}
                                          disabled={isCreatingPlaylist}
                                          className="bg-primary text-primary-foreground text-xs py-2 px-3 rounded-md flex-1 transition-colors flex items-center justify-center gap-1 font-medium"
                                        >
                                          {isCreatingPlaylist ? (
                                            <>
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                              Creating...
                                            </>
                                          ) : (
                                            <>
                                              <PlusCircle className="w-3 h-3" />
                                              Add to Spotify
                                            </>
                                          )}
                                        </button>
                                        
                                        <button className="bg-muted text-xs py-2 px-3 rounded-md hover:bg-muted/70 transition-colors flex items-center justify-center gap-1">
                                          <Play className="w-3 h-3" />
                                          Preview
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                              
                              {message.type === 'bot' && !('playlistSuggestion' in message) && (
                                <div className="flex mt-2 gap-2">
                                  <button 
                                    onClick={() => setInputMessage(`Create a playlist based on ${message.content}`)}
                                    className="text-[10px] text-primary hover:underline flex items-center"
                                  >
                                    <PlusCircle className="w-3 h-3 mr-1" />
                                    Turn into playlist
                                  </button>
                                  <button className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                                    <Heart className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {isTyping && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex justify-start"
                        >
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-fuchsia-500">
                                <Sparkles className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <div className="bg-card border border-border shadow-sm rounded-2xl px-4 py-2">
                              <div className="flex gap-1 items-center h-6">
                                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-2 h-2 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Advanced Message Input */}
                    <div className="p-4 border-t border-border bg-muted/20">
                      <div className="relative">
                        <textarea
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                          rows={1}
                          placeholder="Ask for a playlist or music recommendations..."
                          className="w-full bg-card border border-border rounded-lg px-4 py-3 pr-24 focus:outline-none focus:ring-2 focus:ring-primary min-h-[56px] max-h-32 resize-none"
                        />
                        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                          <button
                            className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                            title="Add emoji"
                          >
                            <span className="text-sm">😊</span>
                          </button>
                          <button
                            onClick={handleSendMessage}
                            disabled={!inputMessage.trim()}
                            className="p-2 rounded-md bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
                            title="Send message"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground mb-2">Try these prompts:</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            "Create a workout playlist with upbeat songs",
                            "Recommend music similar to The Weeknd",
                            "Make me a chill evening playlist",
                            "Songs for a productive work day"
                          ].map((suggestion) => (
                            <button
                              key={suggestion}
                              onClick={() => setInputMessage(suggestion)}
                              className="px-3 py-1.5 text-xs bg-card rounded-md border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground hover:border-primary/50 flex items-center gap-1"
                            >
                              <PlusCircle className="w-3 h-3" />
                              <span>{suggestion}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            
            {/* Playlists View */}
            {activeSection === 'playlists' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                  <div>
                    <h2 className="text-2xl font-bold mb-1">Your Playlists</h2>
                    <p className="text-muted-foreground text-sm">Organize and discover your music collections</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative md:w-60">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input 
                        type="text" 
                        placeholder="Search your playlists..."
                        className="w-full bg-muted rounded-full h-9 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <button 
                      onClick={handleCreatePlaylist}
                      className="flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">New Playlist</span>
                    </button>
                  </div>
                </div>
                
                {/* Split view layout with playlists on left and songs on right */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                  {/* Left side: Playlists grid */}
                  <div className="md:col-span-2 bg-card rounded-xl overflow-hidden shadow-sm border border-border/40 p-4">
                    {/* Playlists Grid - Simplified Layout */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 250px)' }}>
                      {spotifyData?.playlists?.map((playlist: any) => (
                        <motion.div
                          key={playlist.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                          className={`group rounded-xl overflow-hidden bg-card border border-border/30 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer ${
                            selectedPlaylist?.id === playlist.id ? 'border-primary ring-1 ring-primary' : ''
                          }`}
                          onClick={() => handlePlaylistClick(playlist)}
                        >
                          <div className="flex items-center p-3 gap-3">
                            <div className="w-14 h-14 rounded-md relative overflow-hidden flex-shrink-0">
                              {playlist.images?.[0]?.url ? (
                                <Image
                                  src={playlist.images[0].url}
                                  alt={playlist.name}
                                  fill
                                  className="object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center">
                                  <Music className="w-6 h-6 text-primary/70" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium truncate text-sm">{playlist.name}</h4>
                              <p className="text-xs text-muted-foreground">{playlist.tracks.total} tracks</p>
                              <div className="flex items-center gap-1 mt-1">
                                <button 
                                  className="p-1 rounded-full hover:bg-muted transition-colors opacity-0 group-hover:opacity-100" 
                                  onClick={(e) => handlePlayPlaylist(e, playlist.id)}
                                >
                                  <Play className="w-3 h-3 text-primary" />
                                </button>
                                <button className="p-1 rounded-full hover:bg-muted transition-colors opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); /* Like playlist */ }}>
                                  <Heart className="w-3 h-3 text-muted-foreground" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      
                      {/* Create New Playlist Tile */}
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.2 }}
                        className="group rounded-xl overflow-hidden bg-card border border-dashed border-border hover:border-primary/30 hover:shadow-md transition-all cursor-pointer flex items-center p-3 gap-3"
                        onClick={handleCreatePlaylist}
                      >
                        <div className="w-14 h-14 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Plus className="w-6 h-6 text-primary/70" />
                        </div>
                        <div>
                          <h4 className="font-medium text-sm">Create New Playlist</h4>
                          <p className="text-xs text-muted-foreground">Add your perfect collection</p>
                        </div>
                      </motion.div>
                    </div>
                  </div>
                  
                  {/* Right side: Playlist details and songs */}
                  <div className="md:col-span-3 bg-card rounded-xl overflow-hidden shadow-sm border border-border/40">
                    {selectedPlaylist ? (
                      <div className="h-full flex flex-col">
                        {/* Playlist header */}
                        <div className="flex items-center gap-4 p-6 border-b border-border">
                          <div className="w-20 h-20 rounded-lg relative overflow-hidden flex-shrink-0">
                            {selectedPlaylist.images?.[0]?.url ? (
                              <Image
                                src={selectedPlaylist.images[0].url}
                                alt={selectedPlaylist.name}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/30 flex items-center justify-center">
                                <Music className="w-10 h-10 text-primary/70" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h2 className="text-xl font-bold truncate">{selectedPlaylist.name}</h2>
                            <p className="text-muted-foreground text-sm truncate">{selectedPlaylist.description || 'No description'}</p>
                            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                              <span>{selectedPlaylist.owner?.display_name}</span>
                              <span>•</span>
                              <span>{selectedPlaylist.tracks?.total} songs</span>
                            </div>
                          </div>
                          <div>
                            <button className="p-3 bg-primary text-primary-foreground rounded-full hover:scale-105 transition-transform" onClick={(e) => handlePlayPlaylist(e, selectedPlaylist.id)}>
                              <Play className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Songs list */}
                        <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                          <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-2 text-sm text-muted-foreground border-b border-primary/10">
                            <span>#</span>
                            <span>Title</span>
                            <span>Album</span>
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="space-y-1">
                            {selectedPlaylist.tracks?.items?.map((item: any, index: number) => {
                              const track = item.track;
                                  const onPlayTrack = (uri: string) => {
                                  if (!playbackToken) return;
                                  
                                  // Handle playback by using the Spotify URI
                                  try {
                                    // Play the track via Spotify's player
                                    setCurrentTrack(track);
                                    
                                    // For direct playback on Spotify app/web player
                                    window.open(`https://open.spotify.com/track/${uri.split(':').pop()}`, '_blank');
                                  } catch (error) {
                                    console.error('Error playing track:', error);
                                  }
                                  };
                              return (
                                <motion.div
                                  key={track.id}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ delay: index * 0.03 }}
                                  className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-2 rounded-lg hover:bg-primary/5 transition-colors group items-center px-4"
                                >
                                  <button
                                    onClick={() => onPlayTrack?.(track.uri)}
                                    className="w-8 h-8 flex items-center justify-center group"
                                  >
                                    <span className="group-hover:hidden">{index + 1}</span>
                                    <Play className="w-4 h-4 hidden group-hover:block" />
                                  </button>
                                  <div className="flex items-center gap-3 min-w-0">
                                    {track.album?.images?.[0]?.url && (
                                      <Image
                                        src={track.album.images[0].url}
                                        alt={track.name}
                                        width={40}
                                        height={40}
                                        className="rounded"
                                      />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium truncate">{track.name}</div>
                                      <div className="text-sm text-muted-foreground truncate">
                                        {track.artists.map((a: any) => a.name).join(', ')}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="truncate text-muted-foreground">{track.album.name}</div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm text-muted-foreground">
                                      {formatDuration(track.duration_ms)}
                                    </span>
                                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Heart className="w-4 h-4 text-muted-foreground hover:text-primary" />
                                    </button>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center p-10 text-center">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                          <Music className="w-10 h-10 text-primary/50" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Select a playlist</h3>
                        <p className="text-muted-foreground text-sm max-w-md">
                          Choose a playlist from the left to view its songs and details
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Liked Songs View */}
            {activeSection === 'liked' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Liked Songs</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Filter liked songs..."
                      className="bg-muted rounded-full h-9 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-60"
                    />
                  </div>
                </div>
                
                <div className="bg-card rounded-xl shadow-sm overflow-hidden">
                  <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-3 text-sm text-muted-foreground border-b border-border">
                    <span className="w-8 text-center">#</span>
                    <span>Title</span>
                    <span>Album</span>
                    <div className="flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="divide-y divide-border">
                    {spotifyData?.likedSongs?.map((track: any, index: number) => (
                      <motion.div
                        key={track.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.03 }}
                        className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-3 hover:bg-muted/50 transition-colors group cursor-pointer items-center"
                        onClick={() => handlePlayTrack(track)}
                      >
                        <div className="w-8 text-center flex items-center justify-center">
                          <span className="group-hover:hidden text-muted-foreground">{index + 1}</span>
                          <Play className="w-4 h-4 hidden group-hover:block text-foreground" />
                        </div>
                        
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 relative rounded overflow-hidden bg-muted">
                            {track.album?.images?.[0]?.url && (
          <Image
                                src={track.album.images[0].url}
                                alt={track.name}
                                fill
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{track.name}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              {track.artists.map((a: any) => a.name).join(', ')}
                            </div>
                          </div>
                        </div>
                        
                        <div className="truncate text-muted-foreground text-sm">{track.album?.name}</div>
                        
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {Math.floor(track.duration_ms / 60000)}:
                            {Math.floor((track.duration_ms % 60000) / 1000)
                              .toString()
                              .padStart(2, '0')}
                          </span>
                          <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Heart className="w-4 h-4 text-primary fill-primary" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Recently Played View */}
            {activeSection === 'recent' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Recently Played</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input 
                      type="text" 
                      placeholder="Search recently played..."
                      className="bg-muted rounded-full h-9 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary w-60"
                    />
                  </div>
                </div>
                
                <div className="bg-card rounded-xl shadow-sm overflow-hidden">
                  <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-3 text-sm text-muted-foreground border-b border-border">
                    <span className="w-8 text-center">#</span>
                    <span>Title</span>
                    <span>Album</span>
                    <div className="flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                  </div>
                  
                  <div className="divide-y divide-border">
                    {spotifyData?.recentlyPlayed?.map((track: any, index: number) => {
                      // Format the played_at timestamp to a readable date/time
                      const playedAt = new Date(track.played_at);
                      const formattedTime = playedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      const today = new Date();
                      const yesterday = new Date(today);
                      yesterday.setDate(yesterday.getDate() - 1);
                      
                      let playedDate;
                      if (playedAt.toDateString() === today.toDateString()) {
                        playedDate = `Today at ${formattedTime}`;
                      } else if (playedAt.toDateString() === yesterday.toDateString()) {
                        playedDate = `Yesterday at ${formattedTime}`;
                      } else {
                        playedDate = `${playedAt.toLocaleDateString()} at ${formattedTime}`;
                      }
                      
                      return (
                        <motion.div
                          key={`${track.id}-${index}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: index * 0.03 }}
                          className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-6 py-3 hover:bg-muted/50 transition-colors group cursor-pointer items-center"
                          onClick={() => {
                            if (playbackToken) {
                              window.open(`https://open.spotify.com/track/${track.id}`, '_blank');
                            }
                          }}
                        >
                          <div className="w-8 text-center flex items-center justify-center">
                            <span className="group-hover:hidden text-muted-foreground">{index + 1}</span>
                            <Play className="w-4 h-4 hidden group-hover:block text-foreground" />
                          </div>
                          
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 relative rounded overflow-hidden bg-muted">
                              {track.album?.images?.[0]?.url && (
                                <Image
                                  src={track.album.images[0].url}
                                  alt={track.name}
                                  fill
                                  className="object-cover"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{track.name}</div>
                              <div className="text-sm text-muted-foreground truncate">
                                {track.artists.map((a: any) => a.name).join(', ')}
                              </div>
                            </div>
                          </div>
                          
                          <div className="truncate text-muted-foreground text-sm">{track.album?.name}</div>
                          
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {playedDate}
                            </span>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Heart className="w-4 h-4 text-muted-foreground hover:text-primary" />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                    
                    {!spotifyData?.recentlyPlayed || spotifyData.recentlyPlayed.length === 0 && (
                      <div className="p-8 text-center">
                        <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-1">No recently played tracks</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                          Start playing some music on Spotify and your recently played tracks will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Explore View */}
            {activeSection === 'explore' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold mb-6">Discover New Music</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-700 rounded-xl p-6 text-white relative overflow-hidden group shadow-sm">
                      <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-2">Weekly Discoveries</h3>
                        <p className="text-white/80 mb-6 text-sm">Fresh tracks curated just for you based on your listening habits</p>
                        <button className="bg-white text-indigo-600 rounded-full px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors">
                          Explore Now
                        </button>
                      </div>
                      <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full transition-transform group-hover:scale-110" />
                      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                    </div>
                    
                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-6 text-white relative overflow-hidden group shadow-sm">
                      <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-2">Genre Explorer</h3>
                        <p className="text-white/80 mb-6 text-sm">Dive into new genres and expand your musical horizon</p>
                        <button className="bg-white text-orange-600 rounded-full px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors">
                          Browse Genres
                        </button>
                      </div>
                      <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full transition-transform group-hover:scale-110" />
                      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                    </div>
                    
                    <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl p-6 text-white relative overflow-hidden group shadow-sm">
                      <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-2">Mood Matcher</h3>
                        <p className="text-white/80 mb-6 text-sm">Find the perfect playlist to match any mood or occasion</p>
                        <button 
                          onClick={handleCreateFromChat}
                          className="bg-white text-emerald-600 rounded-full px-4 py-2 text-sm font-medium hover:bg-white/90 transition-colors"
                        >
                          Match My Mood
                        </button>
                      </div>
                      <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white/10 rounded-full transition-transform group-hover:scale-110" />
                      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold">Popular This Week</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="bg-card rounded-lg overflow-hidden shadow-sm group">
                        <div className="aspect-square bg-muted animate-pulse" />
                        <div className="p-3">
                          <div className="h-4 bg-muted rounded animate-pulse mb-2" />
                          <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-card rounded-xl shadow-lg p-6 max-w-md w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Create New Playlist</h2>
              <button 
                onClick={() => setShowCreatePlaylistModal(false)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                disabled={isCreatingPlaylist}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {createPlaylistError && (
                <div className="bg-red-500/10 text-red-500 p-3 rounded-lg text-sm">
                  {createPlaylistError}
                </div>
              )}
            
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input 
                  type="text" 
                  placeholder="My Awesome Playlist"
                  value={playlistName}
                  onChange={(e) => setPlaylistName(e.target.value)}
                  disabled={isCreatingPlaylist}
                  className="w-full bg-muted rounded-lg h-10 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  placeholder="Describe your playlist..."
                  value={playlistDescription}
                  onChange={(e) => setPlaylistDescription(e.target.value)}
                  disabled={isCreatingPlaylist}
                  rows={3}
                  className="w-full bg-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                ></textarea>
              </div>
              
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    disabled={isCreatingPlaylist}
                    className="rounded text-primary focus:ring-primary"
                  />
                  Make playlist public
                </label>
              </div>
              
              <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-primary" />
                <div>
                  <h4 className="font-medium text-sm">Need inspiration?</h4>
                  <p className="text-xs text-muted-foreground">
                    Let our AI assistant create a playlist for you
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowCreatePlaylistModal(false);
                    setActiveSection('chat');
                    setInputMessage("Create a playlist with ");
                  }}
                  disabled={isCreatingPlaylist}
                  className="ml-auto bg-primary/20 text-primary rounded-md px-3 py-1 text-xs font-medium hover:bg-primary/30 transition-colors"
                >
                  Try It
                </button>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setShowCreatePlaylistModal(false)}
                  disabled={isCreatingPlaylist}
                  className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={submitPlaylistCreation}
                  disabled={isCreatingPlaylist || !playlistName.trim()}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreatingPlaylist ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : 'Create Playlist'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
