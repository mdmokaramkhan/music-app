"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Clock, Heart, Music, Play, Plus } from "lucide-react";
import Image from "next/image";

interface PlaylistViewProps {
  playlist: any;
  onBack: () => void;
  onPlayTrack: (trackUri: string) => void;
}

export default function PlaylistView({ playlist, onBack, onPlayTrack }: PlaylistViewProps) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-primary/10 rounded-full transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-2xl font-semibold">Playlist Details</h2>
      </div>

      {/* Playlist Info */}
      <div className="flex gap-6 items-start">
        {playlist.images?.[0]?.url ? (
          <Image
            src={playlist.images[0].url}
            alt={playlist.name}
            width={200}
            height={200}
            className="rounded-lg shadow-lg"
          />
        ) : (
          <div className="w-[200px] h-[200px] rounded-lg bg-primary/10 flex items-center justify-center">
            <Music className="w-16 h-16 text-primary" />
          </div>
        )}
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-2">{playlist.name}</h1>
          <p className="text-muted-foreground mb-4">{playlist.description}</p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{playlist.owner?.display_name}</span>
            <span>•</span>
            <span>{playlist.tracks?.total} songs</span>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="bg-card rounded-xl p-6">
        <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 px-4 py-2 text-sm text-muted-foreground border-b border-primary/10">
          <span>#</span>
          <span>Title</span>
          <span>Album</span>
          <Clock className="w-4 h-4" />
        </div>
        <div className="space-y-2 mt-2">
          {playlist.tracks?.items?.map((item: any, index: number) => {
            const track = item.track;
            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.05 }}
                className="grid grid-cols-[auto_1fr_1fr_auto] gap-4 p-2 rounded-lg hover:bg-primary/5 transition-colors group items-center"
              >
                <button
                  onClick={() => onPlayTrack(track.uri)}
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
  );
}

function formatDuration(ms: number) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
} 