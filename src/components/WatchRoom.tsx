import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  Share2,
  Users,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Film,
  Smile,
  Send,
  Sliders,
  Check,
  Crown,
  Volume1,
  Github,
  Sun,
  Eye,
  Settings,
  ShieldCheck,
  Radio
} from 'lucide-react';
import { Participant, ChatMessage, ReactionBurst, SyncPayload } from '../types/party';
import { CineSyncEngine, normalizeVideoUrl } from '../services/syncEngine';
import { getRoomFromFirebase, subscribeToRoom, subscribeToParticipants, subscribeToMessages } from '../services/firebase';
import { playSound } from '../services/soundEffects';
import { FloatingReactions } from './FloatingReactions';
import { VIDEO_PRESETS } from '../data/videoPresets';
import { formatHHMM, trackVisitorAction } from '../services/analyticsTracker';

interface WatchRoomProps {
  roomId: string;
  roomName: string;
  currentParticipant: Participant;
  initialVideoUrl: string;
  initialVideoTitle: string;
  onLeaveRoom: () => void;
  onOpenGitHubHub: () => void;
  onOpenOwnerPanel?: () => void;
  ownerAnnouncement?: string | null;
}

const REACTION_EMOJIS = ['🍿', '🔥', '❤️', '👏', '🤣', '😱', '🚀', '🎉'];

export const WatchRoom: React.FC<WatchRoomProps> = ({
  roomId,
  roomName,
  currentParticipant,
  initialVideoUrl,
  initialVideoTitle,
  onLeaveRoom,
  onOpenGitHubHub,
  onOpenOwnerPanel,
  ownerAnnouncement,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const syncEngineRef = useRef<CineSyncEngine | null>(null);
  const pendingSeekTimeRef = useRef<number | null>(null);

  // Video State
  const [videoUrl, setVideoUrl] = useState(initialVideoUrl);
  const [videoTitle, setVideoTitle] = useState(initialVideoTitle);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);

  // CineSync features
  const [ambilightEnabled, setAmbilightEnabled] = useState(true);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(true);
  const [reactions, setReactions] = useState<ReactionBurst[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  // Chat & Presence State
  const [participants, setParticipants] = useState<Participant[]>([currentParticipant]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      senderId: 'system',
      senderName: 'CineSync Bot',
      senderColor: '#00e5ff',
      text: `Welcome to "${roomName}"! Playback, scrubs, and chat will synchronize in real-time.`,
      timestamp: Date.now(),
      isSystem: true,
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'people' | 'media'>('chat');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Control overlay hide timer
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Prevent local events from echoing back
  const isRemoteActionRef = useRef(false);

  // Initialize Sync Engine
  useEffect(() => {
    const engine = new CineSyncEngine(roomId, currentParticipant.id);
    syncEngineRef.current = engine;

    // Announce user joined
    engine.broadcast({
      type: 'USER_JOIN',
      senderId: currentParticipant.id,
      senderName: currentParticipant.name,
      videoUrl: initialVideoUrl,
      videoTitle: initialVideoTitle,
    });

    // Start heartbeat
    engine.startHeartbeat(currentParticipant);

    // Subscribe to events
    const unsubscribe = engine.subscribe((payload: SyncPayload) => {
      handleIncomingSync(payload);
    });

    return () => {
      unsubscribe();
      engine.broadcast({
        type: 'USER_LEAVE',
        senderId: currentParticipant.id,
        senderName: currentParticipant.name,
      });
      engine.destroy();
    };
  }, [roomId, currentParticipant.id]);

  // Sync initial state and real-time roster/chat from Firebase
  useEffect(() => {
    let active = true;

    // Fetch initial room state from Firebase
    getRoomFromFirebase(roomId).then((room) => {
      if (!active || !room) return;
      console.log('[Sunflower Room Sync] Initial room hydration on device:', room);
      if (room.videoUrl && room.videoUrl !== videoUrl) {
        setVideoUrl(room.videoUrl);
        if (room.videoTitle) setVideoTitle(room.videoTitle);
      }
      if (room.playbackTime !== undefined) {
        pendingSeekTimeRef.current = room.playbackTime;
        if (videoRef.current && videoRef.current.readyState >= 1) {
          videoRef.current.currentTime = room.playbackTime;
          setCurrentTime(room.playbackTime);
          pendingSeekTimeRef.current = null;
        }
      }
      if (room.isPlaying) {
        setIsPlaying(true);
        if (videoRef.current) {
          videoRef.current.play().then(() => setNeedsUserGesture(false)).catch(() => setNeedsUserGesture(true));
        }
      }
    });

    // Realtime room document subscription (cross-device sync)
    const unsubRoom = subscribeToRoom(roomId, (room) => {
      if (!active || !room) return;
      if (room.lastUpdatedBy === currentParticipant.id) return; // avoid self-loop

      console.log('[Sunflower Room Sync] Active room Firestore update received:', {
        isPlaying: room.isPlaying,
        playbackTime: room.playbackTime,
        videoUrl: room.videoUrl,
      });

      if (room.videoUrl && room.videoUrl !== videoUrl) {
        setVideoUrl(room.videoUrl);
        if (room.videoTitle) setVideoTitle(room.videoTitle);
      }

      if (videoRef.current) {
        if (room.playbackTime !== undefined && Math.abs(videoRef.current.currentTime - room.playbackTime) > 1.2) {
          isRemoteActionRef.current = true;
          videoRef.current.currentTime = room.playbackTime;
          setCurrentTime(room.playbackTime);
          setTimeout(() => { isRemoteActionRef.current = false; }, 300);
        }

        if (room.isPlaying) {
          setIsPlaying(true);
          videoRef.current.play().then(() => setNeedsUserGesture(false)).catch(() => setNeedsUserGesture(true));
        } else {
          setIsPlaying(false);
          videoRef.current.pause();
        }
      }
    });

    // Realtime roster from Firebase
    const unsubParticipants = subscribeToParticipants(roomId, (list) => {
      if (!active) return;
      console.log('[Sunflower Room Sync] Participants roster updated from Firestore, count:', list.length);
      if (list && list.length > 0) {
        setParticipants(
          list.map((p) => ({
            id: p.id,
            name: p.name,
            color: p.color,
            isHost: p.isHost,
            avatarSeed: p.avatarSeed || p.name,
            joinedAt: p.joinedAt,
            lastPing: p.lastPing,
          }))
        );
      }
    });

    // Realtime chat from Firebase
    const unsubMessages = subscribeToMessages(roomId, (msgs) => {
      if (!active) return;
      if (msgs && msgs.length > 0) {
        setMessages(
          msgs.map((m) => ({
            id: m.id,
            senderId: m.senderId,
            senderName: m.senderName,
            senderColor: m.senderColor,
            text: m.text,
            timestamp: m.timestamp,
            isSystem: m.isSystem,
          }))
        );
      }
    });

    return () => {
      active = false;
      unsubRoom();
      unsubParticipants();
      unsubMessages();
    };
  }, [roomId, currentParticipant.id]);

  // Handle incoming payloads
  const handleIncomingSync = useCallback((payload: SyncPayload) => {
    const video = videoRef.current;
    if (!video) return;

    switch (payload.type) {
      case 'PLAY':
        isRemoteActionRef.current = true;
        if (payload.currentTime !== undefined && Math.abs(video.currentTime - payload.currentTime) > 1.2) {
          video.currentTime = payload.currentTime;
        }
        video.play().catch(() => {});
        setIsPlaying(true);
        setTimeout(() => { isRemoteActionRef.current = false; }, 300);
        break;

      case 'PAUSE':
        isRemoteActionRef.current = true;
        if (payload.currentTime !== undefined && Math.abs(video.currentTime - payload.currentTime) > 1.2) {
          video.currentTime = payload.currentTime;
        }
        video.pause();
        setIsPlaying(false);
        setTimeout(() => { isRemoteActionRef.current = false; }, 300);
        break;

      case 'SEEK':
        if (payload.currentTime !== undefined) {
          isRemoteActionRef.current = true;
          video.currentTime = payload.currentTime;
          setCurrentTime(payload.currentTime);
          // System announcement
          addSystemMessage(`${payload.senderName} jumped to ${formatTime(payload.currentTime)}`);
          setTimeout(() => { isRemoteActionRef.current = false; }, 300);
        }
        break;

      case 'SPEED':
        if (payload.playbackRate) {
          video.playbackRate = payload.playbackRate;
          setPlaybackRate(payload.playbackRate);
          addSystemMessage(`${payload.senderName} set playback speed to ${payload.playbackRate}x`);
        }
        break;

      case 'URL_CHANGE':
        if (payload.videoUrl && payload.videoUrl !== videoUrl) {
          setVideoUrl(payload.videoUrl);
          if (payload.videoTitle) setVideoTitle(payload.videoTitle);
          addSystemMessage(`${payload.senderName} changed video to "${payload.videoTitle || 'New Media'}"`);
        }
        break;

      case 'CHAT':
        if (payload.chatMessage) {
          setMessages((prev) => [...prev, payload.chatMessage!]);
          if (soundEffectsEnabled && payload.senderId !== currentParticipant.id) {
            playSound('pop');
          }
        }
        break;

      case 'REACTION':
        if (payload.reactionEmoji) {
          triggerReactionDisplay(payload.reactionEmoji, payload.senderName);
          if (soundEffectsEnabled) {
            playSound('pop');
          }
        }
        break;

      case 'USER_JOIN':
        if (payload.senderId !== currentParticipant.id) {
          setParticipants((prev) => {
            if (prev.some((p) => p.id === payload.senderId)) return prev;
            return [
              ...prev,
              {
                id: payload.senderId,
                name: payload.senderName,
                color: '#00e5ff',
                isHost: false,
                avatarSeed: payload.senderName,
                joinedAt: Date.now(),
                lastPing: Date.now(),
              },
            ];
          });
          addSystemMessage(`${payload.senderName} joined the room 👋`);
          if (soundEffectsEnabled) playSound('join');

          // If we are host or already playing, send current state to newcomer
          if (currentParticipant.isHost && videoRef.current) {
            syncEngineRef.current?.broadcast({
              type: 'SYNC_STATE',
              senderId: currentParticipant.id,
              senderName: currentParticipant.name,
              currentTime: videoRef.current.currentTime,
              isPlaying: !videoRef.current.paused,
              playbackRate: videoRef.current.playbackRate,
              videoUrl: videoUrl,
              videoTitle: videoTitle,
            });
          }
        }
        break;

      case 'SYNC_STATE':
        if (payload.videoUrl && payload.videoUrl !== videoUrl) {
          setVideoUrl(payload.videoUrl);
          if (payload.videoTitle) setVideoTitle(payload.videoTitle);
        }
        if (payload.currentTime !== undefined && Math.abs(video.currentTime - payload.currentTime) > 1.5) {
          video.currentTime = payload.currentTime;
        }
        if (payload.playbackRate) {
          video.playbackRate = payload.playbackRate;
          setPlaybackRate(payload.playbackRate);
        }
        if (payload.isPlaying && video.paused) {
          video.play().catch(() => {});
          setIsPlaying(true);
        } else if (!payload.isPlaying && !video.paused) {
          video.pause();
          setIsPlaying(false);
        }
        break;

      case 'PING':
        setParticipants((prev) =>
          prev.map((p) => (p.id === payload.senderId ? { ...p, lastPing: Date.now() } : p))
        );
        break;

      case 'USER_LEAVE':
        setParticipants((prev) => prev.filter((p) => p.id !== payload.senderId));
        addSystemMessage(`${payload.senderName} left the room`);
        break;
    }
  }, [videoUrl, videoTitle, soundEffectsEnabled, currentParticipant]);

  const addSystemMessage = (text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `sys-${Date.now()}-${Math.random()}`,
        senderId: 'system',
        senderName: 'CineSync',
        senderColor: '#64748b',
        text,
        timestamp: Date.now(),
        isSystem: true,
      },
    ]);
  };

  const triggerReactionDisplay = (emoji: string, senderName: string) => {
    const newReaction: ReactionBurst = {
      id: `burst-${Date.now()}-${Math.random()}`,
      emoji,
      senderName,
      x: 15 + Math.random() * 70,
      y: 80,
      size: 32 + Math.floor(Math.random() * 18),
    };
    setReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 3000);
  };

  // Video event handlers
  const handleTogglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
      trackVisitorAction(currentParticipant.id, 'play', `Resumed playback at ${formatTime(video.currentTime)}`);
      syncEngineRef.current?.broadcast({
        type: 'PLAY',
        senderId: currentParticipant.id,
        senderName: currentParticipant.name,
        currentTime: video.currentTime,
      });
    } else {
      video.pause();
      setIsPlaying(false);
      trackVisitorAction(currentParticipant.id, 'pause', `Paused playback at ${formatTime(video.currentTime)}`);
      syncEngineRef.current?.broadcast({
        type: 'PAUSE',
        senderId: currentParticipant.id,
        senderName: currentParticipant.name,
        currentTime: video.currentTime,
      });
    }
  };

  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = newTime;
    setCurrentTime(newTime);
    trackVisitorAction(currentParticipant.id, 'seek', `Scrubbed video to ${formatTime(newTime)}`);
    syncEngineRef.current?.broadcast({
      type: 'SEEK',
      senderId: currentParticipant.id,
      senderName: currentParticipant.name,
      currentTime: newTime,
    });
  };

  const handleSkip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds));
    handleSeek(target);
  };

  const handleSpeedChange = (speed: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackRate(speed);
    syncEngineRef.current?.broadcast({
      type: 'SPEED',
      senderId: currentParticipant.id,
      senderName: currentParticipant.name,
      playbackRate: speed,
    });
  };

  const handleVideoChange = (newUrl: string, newTitle: string) => {
    const direct = normalizeVideoUrl(newUrl);
    setVideoUrl(direct);
    setVideoTitle(newTitle);
    syncEngineRef.current?.broadcast({
      type: 'URL_CHANGE',
      senderId: currentParticipant.id,
      senderName: currentParticipant.name,
      videoUrl: direct,
      videoTitle: newTitle,
    });
  };

  const handleSendReaction = (emoji: string) => {
    triggerReactionDisplay(emoji, currentParticipant.name);
    trackVisitorAction(currentParticipant.id, 'reaction', `Reacted with emoji ${emoji}`);
    if (soundEffectsEnabled) playSound('pop');
    syncEngineRef.current?.broadcast({
      type: 'REACTION',
      senderId: currentParticipant.id,
      senderName: currentParticipant.name,
      reactionEmoji: emoji,
    });
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMsg: ChatMessage = {
      id: `chat-${Date.now()}-${Math.random()}`,
      senderId: currentParticipant.id,
      senderName: currentParticipant.name,
      senderColor: currentParticipant.color,
      text: chatInput.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, newMsg]);
    trackVisitorAction(currentParticipant.id, 'message', `Sent: "${chatInput.trim().substring(0, 30)}"`);
    if (soundEffectsEnabled) playSound('chime');

    syncEngineRef.current?.broadcast({
      type: 'CHAT',
      senderId: currentParticipant.id,
      senderName: currentParticipant.name,
      chatMessage: newMsg,
    });

    setChatInput('');
  };

  // Force sync ping
  const handleForceSyncWithHost = () => {
    if (soundEffectsEnabled) playSound('sync');
    syncEngineRef.current?.broadcast({
      type: 'USER_JOIN',
      senderId: currentParticipant.id,
      senderName: currentParticipant.name,
    });
    addSystemMessage('Requested fresh synchronization ping from room peers.');
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip(10);
      } else if (e.key === 'm' || e.key === 'M') {
        setIsMuted((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'c' || e.key === 'C') {
        setIsChatOpen((prev) => !prev);
      } else if (e.key === 'a' || e.key === 'A') {
        setAmbilightEnabled((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Controls auto-hide
  const resetControlsTimer = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = window.setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3200);
  };

  // Auto scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleFullscreen = () => {
    const container = document.getElementById('player-viewport-container');
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  const copyRoomLink = async () => {
    const cleanPath = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : `${window.location.pathname}/`;
    const link = `${window.location.origin}${cleanPath}?room=${roomId}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link);
      }
    } catch {
      // Ignore
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-[#07090e]">
      {/* Top Room Sub-bar */}
      <div className="h-11 px-4 md:px-6 border-b border-white/8 bg-[#0a0e16] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-display font-bold text-xs text-white truncate max-w-[180px] sm:max-w-xs">
              {roomName}
            </span>
          </div>
          <span className="text-slate-500 text-xs hidden sm:inline">&bull;</span>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded">
            {roomId}
          </span>
          <span className="text-slate-500 text-xs hidden sm:inline">&bull;</span>
          <span className="text-xs text-slate-400 truncate max-w-[180px] hidden md:inline">
            Now: {videoTitle}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Owner Dev Console Button - Only for Room Owner */}
          {currentParticipant.isHost && onOpenOwnerPanel && (
            <button
              onClick={onOpenOwnerPanel}
              title="Sunflower Owner & Dev Console"
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-lg transition-colors cursor-pointer shadow-sm shadow-amber-500/10"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Owner Dev</span>
            </button>
          )}

          {/* Quick GitHub Hub Button */}
          <button
            onClick={onOpenGitHubHub}
            title="GitHub Hosting Hub & Export"
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <Github className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">GitHub Pages</span>
          </button>

          {/* Force Re-Sync */}
          <button
            onClick={handleForceSyncWithHost}
            title="Force synchronization with room peers"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Share Link */}
          <button
            onClick={copyRoomLink}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-lg transition-colors cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copiedLink ? 'Link Copied!' : 'Invite Friends'}</span>
          </button>

          {/* Toggle Chat */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1 ${
              isChatOpen
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'text-slate-400 hover:text-white border-white/10 hover:bg-white/5'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono font-bold">{messages.length}</span>
          </button>
        </div>
      </div>

      {/* Owner Global Announcement Banner if active */}
      {ownerAnnouncement && (
        <div className="bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 px-4 py-1.5 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg animate-pulse">
          <Radio className="w-3.5 h-3.5 shrink-0" />
          <span>{ownerAnnouncement}</span>
        </div>
      )}

      {/* Main Split Body: Video Player + Chat Drawer */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Video Player Viewport */}
        <div
          id="player-viewport-container"
          onMouseMove={resetControlsTimer}
          className="flex-1 flex flex-col items-center justify-center bg-black relative overflow-hidden select-none min-w-0"
        >
          {/* Ambilight Ambient Glow behind player */}
          {ambilightEnabled && (
            <div
              className="absolute inset-0 pointer-events-none filter blur-[100px] opacity-25 transition-all duration-700 -z-0"
              style={{
                background: isPlaying
                  ? 'radial-gradient(circle at center, rgba(0, 229, 255, 0.45) 0%, rgba(255, 45, 114, 0.25) 45%, transparent 75%)'
                  : 'radial-gradient(circle at center, rgba(14, 21, 35, 0.6) 0%, transparent 70%)',
              }}
            />
          )}

          {/* Video element */}
          <div className="relative w-full h-full flex items-center justify-center z-10">
            <video
              ref={videoRef}
              src={videoUrl}
              playsInline
              onClick={handleTogglePlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={() => {
                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) {
                  setDuration(videoRef.current.duration);
                  if (pendingSeekTimeRef.current !== null) {
                    console.log('[Sunflower Room Sync] Applying pending seek time on metadata loaded:', pendingSeekTimeRef.current);
                    videoRef.current.currentTime = pendingSeekTimeRef.current;
                    setCurrentTime(pendingSeekTimeRef.current);
                    pendingSeekTimeRef.current = null;
                  }
                }
              }}
              onWaiting={() => setIsBuffering(true)}
              onPlaying={() => setIsBuffering(false)}
              className="w-full h-full object-contain max-h-[100vh] cursor-pointer"
            />

            {/* Mobile / Autoplay Gesture Override Prompt */}
            {needsUserGesture && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current
                        .play()
                        .then(() => setNeedsUserGesture(false))
                        .catch(() => {});
                    }
                  }}
                  className="bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold px-5 py-2.5 rounded-full shadow-2xl shadow-amber-500/50 flex items-center gap-2 text-xs animate-bounce cursor-pointer tracking-wide uppercase"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Tap to Sync Playback 🍿</span>
                </button>
              </div>
            )}

            {/* Floating Reactions Overlay */}
            <FloatingReactions reactions={reactions} />

            {/* Buffering Spinner */}
            {isBuffering && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-20">
                <div className="w-12 h-12 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}

            {/* Big center play icon when paused and hovered */}
            {!isPlaying && (
              <div
                onClick={handleTogglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/35 cursor-pointer z-20 transition-opacity"
              >
                <div className="w-18 h-18 rounded-full bg-cyan-400/90 text-slate-950 flex items-center justify-center shadow-2xl shadow-cyan-500/40 hover:scale-110 transition-transform pl-1">
                  <Play className="w-9 h-9 fill-current" />
                </div>
              </div>
            )}
          </div>

          {/* Interactive Player Controls Overlay */}
          <div
            className={`absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 z-30 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Progress Bar / Scrubber */}
            <div className="mb-3 group relative cursor-pointer">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={(e) => handleSeek(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-white/20 hover:h-2 rounded-lg appearance-none cursor-pointer accent-cyan-400 transition-all"
              />
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between gap-3 text-white text-xs">
              <div className="flex items-center gap-3">
                {/* Play/Pause */}
                <button
                  onClick={handleTogglePlay}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Skip back/forward */}
                <button
                  onClick={() => handleSkip(-10)}
                  title="Rewind 10s"
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSkip(10)}
                  title="Forward 10s"
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                </button>

                {/* Volume slider */}
                <div className="flex items-center gap-1.5 group">
                  <button
                    onClick={() => {
                      const next = !isMuted;
                      setIsMuted(next);
                      if (videoRef.current) videoRef.current.muted = next;
                    }}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setVolume(val);
                      setIsMuted(false);
                      if (videoRef.current) {
                        videoRef.current.volume = val;
                        videoRef.current.muted = false;
                      }
                    }}
                    className="w-16 h-1 bg-white/20 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                </div>

                {/* Time Display */}
                <span className="font-mono text-slate-300 text-[11px] tabular-nums">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              {/* Right side controls */}
              <div className="flex items-center gap-2">
                {/* Quick Emoji Reaction Buttons */}
                <div className="hidden lg:flex items-center gap-1 bg-black/40 border border-white/10 px-2 py-1 rounded-lg backdrop-blur-md">
                  {REACTION_EMOJIS.slice(0, 5).map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => handleSendReaction(emoji)}
                      className="hover:scale-125 transition-transform p-0.5 cursor-pointer text-base"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Playback speed selector */}
                <select
                  value={playbackRate}
                  onChange={(e) => handleSpeedChange(parseFloat(e.target.value))}
                  className="bg-black/60 border border-white/15 text-slate-200 text-xs rounded-md px-1.5 py-1 focus:outline-none cursor-pointer"
                >
                  <option value={0.5}>0.5x</option>
                  <option value={0.75}>0.75x</option>
                  <option value={1}>1.0x</option>
                  <option value={1.25}>1.25x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2.0x</option>
                </select>

                {/* Ambilight Toggle */}
                <button
                  onClick={() => setAmbilightEnabled(!ambilightEnabled)}
                  title={ambilightEnabled ? 'Disable Cinema Ambient Glow' : 'Enable Cinema Ambient Glow'}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    ambilightEnabled
                      ? 'bg-cyan-400/20 text-cyan-300 border-cyan-400/40'
                      : 'text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  <Sun className="w-4 h-4" />
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Live Chat, People & Media Sidebar Drawer */}
        {isChatOpen && (
          <aside className="w-80 md:w-88 border-l border-white/8 bg-[#0b0f17] flex flex-col h-full shrink-0 z-20 transition-all">
            {/* Drawer Tabs */}
            <div className="h-10 border-b border-white/8 flex items-center px-3 bg-[#080c13] shrink-0">
              <button
                onClick={() => setActiveTab('chat')}
                className={`flex-1 py-1 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'chat'
                    ? 'text-cyan-400 bg-white/5 border border-white/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Live Chat</span>
              </button>
              <button
                onClick={() => setActiveTab('people')}
                className={`flex-1 py-1 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'people'
                    ? 'text-cyan-400 bg-white/5 border border-white/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Friends ({participants.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('media')}
                className={`flex-1 py-1 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === 'media'
                    ? 'text-cyan-400 bg-white/5 border border-white/10'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Media</span>
              </button>
            </div>

            {/* TAB 1: Chat Stream */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex flex-col min-h-0">
                <div
                  ref={chatScrollRef}
                  className="flex-1 p-3 overflow-y-auto space-y-3 font-sans text-xs"
                >
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={
                        msg.isSystem
                          ? 'p-2 rounded-lg bg-amber-500/8 border border-amber-500/20 text-xs text-amber-200/90 flex items-center justify-between gap-2'
                          : 'space-y-1 bg-[#0c101a] border border-white/8 p-2.5 rounded-xl shadow-sm'
                      }
                    >
                      {!msg.isSystem ? (
                        <>
                          <div className="flex items-center justify-between gap-2 pb-1 border-b border-white/5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className="font-bold tracking-tight text-xs truncate"
                                style={{ color: msg.senderColor || '#fbbf24' }}
                              >
                                {msg.senderName}
                              </span>
                              {msg.senderId === currentParticipant.id && (
                                <span className="text-[9px] font-mono text-amber-300 font-semibold bg-amber-500/15 px-1 py-0.2 rounded border border-amber-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            {/* Legible, Formatted Timestamp (HH:MM) */}
                            <span
                              className="text-[11px] font-mono font-semibold text-amber-300/95 bg-black/50 px-1.5 py-0.5 rounded border border-amber-500/25 tabular-nums shrink-0 shadow-xs"
                              title={new Date(msg.timestamp).toLocaleString()}
                            >
                              {formatHHMM(msg.timestamp)}
                            </span>
                          </div>
                          <p className="text-slate-200 text-xs break-words pt-1 leading-relaxed">
                            {msg.text}
                          </p>
                        </>
                      ) : (
                        <>
                          <span className="italic">{msg.text}</span>
                          <span className="text-[10px] font-mono font-medium text-amber-400/80 bg-black/40 px-1.5 py-0.5 rounded border border-amber-500/20 tabular-nums shrink-0">
                            {formatHHMM(msg.timestamp)}
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>

                {/* Reaction Quick Bar */}
                <div className="p-2 border-t border-white/8 bg-[#090d14] flex items-center justify-between px-3">
                  <span className="text-[10px] font-mono text-slate-500">React:</span>
                  <div className="flex items-center gap-1.5">
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        onClick={() => handleSendReaction(emoji)}
                        className="text-sm hover:scale-125 transition-transform cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Form */}
                <form
                  onSubmit={handleSendChat}
                  className="p-2.5 border-t border-white/8 bg-[#0a0e16] flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    maxLength={240}
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Type a message to the room..."
                    className="flex-1 bg-[#06080d] border border-white/10 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                  <button
                    type="submit"
                    className="p-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* TAB 2: Participants */}
            {activeTab === 'people' && (
              <div className="flex-1 p-3 overflow-y-auto space-y-2">
                <div className="text-[11px] font-mono text-slate-400 mb-2 px-1">
                  Active Party Members ({participants.length})
                </div>
                {participants.map((person) => (
                  <div
                    key={person.id}
                    className="p-2.5 rounded-xl border border-white/8 bg-[#0e1420] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-slate-950"
                        style={{ backgroundColor: person.color || '#00e5ff' }}
                      >
                        {person.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white">{person.name}</span>
                          {person.isHost && (
                            <span className="text-[9px] font-mono text-amber-400 bg-amber-950/60 border border-amber-500/30 px-1 py-0.2 rounded flex items-center gap-0.5">
                              <Crown className="w-2.5 h-2.5" /> HOST
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {person.id === currentParticipant.id ? 'You · Connected' : 'Connected'}
                        </span>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  </div>
                ))}

                <div className="pt-4 border-t border-white/8 mt-4">
                  <button
                    onClick={copyRoomLink}
                    className="w-full py-2 bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Copy Room Invitation Link</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: Change Media / Switch Video */}
            {activeTab === 'media' && (
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                <div className="text-[11px] font-mono text-slate-400 px-1">
                  Switch Cinema Stream
                </div>
                <div className="space-y-2">
                  {VIDEO_PRESETS.map((preset) => (
                    <div
                      key={preset.id}
                      onClick={() => handleVideoChange(preset.url, preset.title)}
                      className={`p-2 rounded-xl border flex items-center gap-2.5 cursor-pointer transition-all ${
                        videoUrl === preset.url
                          ? 'border-cyan-400 bg-cyan-950/30'
                          : 'border-white/8 bg-[#0e1420] hover:border-white/20'
                      }`}
                    >
                      <img
                        src={preset.thumbnail}
                        alt={preset.title}
                        className="w-12 h-8 rounded object-cover shrink-0 border border-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-white truncate">{preset.title}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <span>{preset.duration}</span>
                          <span>&bull;</span>
                          <span className="text-cyan-400">{preset.resolution}</span>
                        </div>
                      </div>
                      {videoUrl === preset.url && (
                        <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>

                {/* Custom stream input */}
                <div className="pt-3 border-t border-white/8 space-y-2">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Paste Custom / GitHub Stream URL:
                  </label>
                  <input
                    type="url"
                    placeholder="https://.../movie.mp4 or github.com/..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const target = (e.target as HTMLInputElement).value;
                        if (target.trim()) {
                          handleVideoChange(target.trim(), 'Custom Stream');
                        }
                      }
                    }}
                    className="w-full bg-[#06080d] border border-white/10 focus:border-cyan-400 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                  />
                  <p className="text-[10px] text-slate-500">
                    Press Enter to change stream for everyone in the room.
                  </p>
                </div>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
};
