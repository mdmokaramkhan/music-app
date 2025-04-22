"use client";

import { useEffect, useState } from 'react';
import { Heart, Pause, Play, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import Image from 'next/image';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady: () => void;
    Spotify: any;
  }
}

interface SpotifyPlayerProps {
  accessToken: string;
}

export default function SpotifyPlayer({ accessToken }: SpotifyPlayerProps) {
  const [player, setPlayer] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<any>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;

    document.body.appendChild(script);

    window.onSpotifyWebPlaybackSDKReady = () => {
      const player = new window.Spotify.Player({
        name: 'Playlist Curator Web Player',
        getOAuthToken: cb => { cb(accessToken); },
        volume: 0.5
      });

      player.addListener('ready', ({ device_id }: { device_id: string }) => {
        console.log('Ready with Device ID', device_id);
        setPlayer(player);
      });

      player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
        console.log('Device ID has gone offline', device_id);
      });

      player.addListener('player_state_changed', (state: any) => {
        if (!state) return;

        setCurrentTrack(state.track_window.current_track);
        setIsPaused(state.paused);
      });

      player.connect();
    };

    return () => {
      if (player) {
        player.disconnect();
      }
    };
  }, [accessToken]);

  if (!player || !currentTrack) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-lg border-t border-primary/10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Track Info */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {currentTrack.album.images?.[0]?.url && (
              <Image
                src={currentTrack.album.images[0].url}
                alt={currentTrack.name}
                width={56}
                height={56}
                className="rounded"
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{currentTrack.name}</div>
              <div className="text-sm text-muted-foreground truncate">
                {currentTrack.artists.map((a: any) => a.name).join(', ')}
              </div>
            </div>
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
              <Heart className="w-5 h-5 text-muted-foreground hover:text-primary" />
            </button>
          </div>

          {/* Playback Controls */}
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
              <SkipBack className="w-5 h-5" />
            </button>
            <button
              onClick={() => player.togglePlay()}
              className="p-3 bg-primary text-primary-foreground rounded-full hover:scale-105 transition-transform"
            >
              {isPaused ? (
                <Play className="w-6 h-6" />
              ) : (
                <Pause className="w-6 h-6" />
              )}
            </button>
            <button className="p-2 hover:bg-primary/10 rounded-full transition-colors">
              <SkipForward className="w-5 h-5" />
            </button>
          </div>

          {/* Volume */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <Volume2 className="w-5 h-5 text-muted-foreground" />
            <input
              type="range"
              min="0"
              max="100"
              className="w-24"
              onChange={e => player.setVolume(parseInt(e.target.value) / 100)}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 