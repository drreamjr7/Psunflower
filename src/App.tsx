import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { WatchRoom } from './components/WatchRoom';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { GitHubHostingModal } from './components/GitHubHostingModal';
import { OwnerPanelModal } from './components/OwnerPanelModal';
import { Participant, VideoPreset } from './types/party';
import { VIDEO_PRESETS } from './data/videoPresets';
import { generateRoomCode, getRandomColor, CineSyncEngine } from './services/syncEngine';
import { trackVisitorJoin } from './services/analyticsTracker';
import {
  getRoomFromFirebase,
  createRoomInFirebase,
  joinRoomParticipant,
  FirebaseRoom,
} from './services/firebase';
import { Github, ShieldCheck, AlertTriangle, ArrowRight, Home, Plus, Loader2 } from 'lucide-react';

/**
 * Robust URL room extractor handling:
 * - ?room=XYZ
 * - ?/&room=XYZ (GitHub Pages SPA 404 redirection)
 * - #room=XYZ
 * - Trailing slashes or URL encoded values
 */
function extractRoomIdFromUrl(): string | null {
  try {
    const searchParams = new URLSearchParams(window.location.search);
    const searchRoom = searchParams.get('room');
    if (searchRoom) {
      return searchRoom.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
    }

    const hrefMatch = window.location.href.match(/[?&#]room=([a-zA-Z0-9-_]+)/i);
    if (hrefMatch && hrefMatch[1]) {
      return hrefMatch[1].trim().toUpperCase();
    }

    const hashMatch = window.location.hash.match(/room=([a-zA-Z0-9-_]+)/i);
    if (hashMatch && hashMatch[1]) {
      return hashMatch[1].trim().toUpperCase();
    }
  } catch (e) {
    console.error('[Sunflower Room Sync] URL parsing error:', e);
  }
  return null;
}

export default function App() {
  // Navigation / Room State
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string>('Sunflower Cinema Lounge');
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(VIDEO_PRESETS[0].url);
  const [currentVideoTitle, setCurrentVideoTitle] = useState<string>(VIDEO_PRESETS[0].title);

  // Connecting / Verifying indicator
  const [isConnectingRoom, setIsConnectingRoom] = useState(false);
  const [connectingRoomCode, setConnectingRoomCode] = useState<string | null>(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinModalInitialCode, setJoinModalInitialCode] = useState('');
  const [isJoinInvite, setIsJoinInvite] = useState(false);
  const [isGitHubHubOpen, setIsGitHubHubOpen] = useState(false);
  const [isOwnerPanelOpen, setIsOwnerPanelOpen] = useState(false);
  const [ownerAnnouncement, setOwnerAnnouncement] = useState<string | null>(null);

  // Room not found state
  const [roomNotFoundCode, setRoomNotFoundCode] = useState<string | null>(null);

  // Owner calculation: only true if on lounge or if host of the current room
  const isOwner = !currentRoomId || !!currentParticipant?.isHost;

  // Keyboard shortcut for Owner Panel (Ctrl+Shift+D or Alt+O) - only for owner
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) ||
        (e.altKey && (e.key === 'o' || e.key === 'O'))
      ) {
        if (!isOwner) return;
        e.preventDefault();
        setIsOwnerPanelOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOwner]);

  // Read and verify room from URL on page load or URL change
  useEffect(() => {
    const handleUrlRoom = async () => {
      const urlRoomId = extractRoomIdFromUrl();
      console.log('[Sunflower Room Sync] URL room ID:', urlRoomId);

      if (urlRoomId) {
        // If already connected to this exact room, skip
        if (currentRoomId === urlRoomId && currentParticipant) {
          console.log('[Sunflower Room Sync] Already active in room:', urlRoomId);
          return;
        }

        setIsConnectingRoom(true);
        setConnectingRoomCode(urlRoomId);

        try {
          const room = await getRoomFromFirebase(urlRoomId);

          if (room) {
            console.log('[Sunflower Room Sync] Found existing watch room in Firestore:', room);
            setJoinModalInitialCode(urlRoomId);
            setIsJoinInvite(true);
            setIsJoinOpen(true);
            setRoomNotFoundCode(null);
          } else {
            console.log('[Sunflower Room Sync] Room lookup failed: room does not exist in Firestore:', urlRoomId);
            setRoomNotFoundCode(urlRoomId);
            setIsJoinOpen(false);
          }
        } catch (err) {
          console.error('[Sunflower Room Sync] Error during room verification:', err);
          setRoomNotFoundCode(urlRoomId);
          setIsJoinOpen(false);
        } finally {
          setIsConnectingRoom(false);
        }
      }
    };

    handleUrlRoom();

    const handlePopState = () => handleUrlRoom();
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentRoomId]);

  // Handle Room Creation
  const handleCreateRoom = async ({
    roomCode,
    roomName,
    hostName,
    videoUrl,
    videoTitle,
  }: {
    roomCode: string;
    roomName: string;
    hostName: string;
    videoUrl: string;
    videoTitle: string;
  }) => {
    const cleanCode = (roomCode || generateRoomCode()).trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
    const cleanRoomName = roomName.trim() || 'Sunflower Watch Party';

    console.log('[Sunflower Room Sync] Initiating Room Creation:', { cleanCode, cleanRoomName });

    const participant: Participant = {
      id: `host-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: hostName.trim() || 'Host',
      color: '#f59e0b',
      isHost: true,
      avatarSeed: hostName.trim() || 'Host',
      joinedAt: Date.now(),
      lastPing: Date.now(),
    };

    // 1. Create Room in Firebase Realtime Store
    await createRoomInFirebase({
      roomId: cleanCode,
      roomName: cleanRoomName,
      hostId: participant.id,
      hostName: participant.name,
      videoUrl,
      videoTitle,
      isPlaying: false,
      playbackTime: 0,
      playbackRate: 1,
      lastUpdated: Date.now(),
      createdAt: Date.now(),
    });

    // 2. Register Host presence in Firestore
    await joinRoomParticipant(cleanCode, {
      id: participant.id,
      name: participant.name,
      color: participant.color,
      isHost: true,
      joinedAt: participant.joinedAt,
      lastPing: Date.now(),
      avatarSeed: participant.avatarSeed,
    });

    // 3. Generate Invite URL with trailing slash safety
    const cleanPath = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : `${window.location.pathname}/`;
    const inviteUrl = `${window.location.origin}${cleanPath}?room=${cleanCode}`;
    console.log('[Sunflower Room Sync] Invite URL generated:', inviteUrl);

    trackVisitorJoin(participant.id, hostName, 'owner', cleanCode, cleanRoomName, participant.color);

    setCurrentParticipant(participant);
    setCurrentRoomId(cleanCode);
    setCurrentRoomName(cleanRoomName);
    setCurrentVideoUrl(videoUrl);
    setCurrentVideoTitle(videoTitle);
    setIsCreateOpen(false);

    // Update browser address bar
    window.history.pushState({ room: cleanCode }, '', `${cleanPath}?room=${cleanCode}`);
  };

  // Handle Join Room
  const handleJoinRoom = async (roomCode: string, userName: string) => {
    const cleanCode = roomCode.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
    console.log('[Sunflower Room Sync] Attempting to join room:', cleanCode);

    // Look up exact room in Firebase
    const room = await getRoomFromFirebase(cleanCode);
    if (!room) {
      console.warn('[Sunflower Room Sync] Join failed - room not found in Firestore:', cleanCode);
      setIsJoinOpen(false);
      setRoomNotFoundCode(cleanCode);
      return;
    }

    const participant: Participant = {
      id: `guest-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: userName.trim() || 'Guest',
      color: getRandomColor(),
      isHost: false, // Explicitly not host
      avatarSeed: userName.trim() || 'Guest',
      joinedAt: Date.now(),
      lastPing: Date.now(),
    };

    // Register Guest presence in Firestore
    await joinRoomParticipant(cleanCode, {
      id: participant.id,
      name: participant.name,
      color: participant.color,
      isHost: false,
      joinedAt: participant.joinedAt,
      lastPing: Date.now(),
      avatarSeed: participant.avatarSeed,
    });

    console.log('[Sunflower Room Sync] join result:', {
      success: true,
      roomId: cleanCode,
      participantId: participant.id,
      participantName: participant.name,
      roomName: room.roomName,
    });

    trackVisitorJoin(participant.id, userName, 'guest', cleanCode, room.roomName, participant.color);

    setCurrentParticipant(participant);
    setCurrentRoomId(cleanCode);
    setCurrentRoomName(room.roomName);
    setCurrentVideoUrl(room.videoUrl);
    setCurrentVideoTitle(room.videoTitle);
    setIsJoinOpen(false);
    setIsJoinInvite(false);

    // Update address bar with clean path
    const cleanPath = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : `${window.location.pathname}/`;
    window.history.pushState({ room: cleanCode }, '', `${cleanPath}?room=${cleanCode}`);
  };

  // Quick launch preset directly from Hero
  const handleQuickLaunchPreset = (preset: VideoPreset) => {
    const code = generateRoomCode();
    handleCreateRoom({
      roomCode: code,
      roomName: `${preset.title} 🌻 Cinema`,
      hostName: 'Owner',
      videoUrl: preset.url,
      videoTitle: preset.title,
    });
  };

  const handleLeaveRoom = () => {
    setCurrentRoomId(null);
    setCurrentParticipant(null);
    const cleanPath = window.location.pathname.endsWith('/')
      ? window.location.pathname
      : `${window.location.pathname}/`;
    window.history.pushState({}, '', cleanPath);
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Owner Dev Actions
  const handleBroadcastAnnouncement = (text: string) => {
    setOwnerAnnouncement(text);
    if (currentRoomId) {
      const engine = new CineSyncEngine(currentRoomId, 'owner-announcer');
      engine.broadcast({
        type: 'CHAT',
        senderId: 'owner',
        senderName: 'Sunflower 🌻 Owner Notice',
        chatMessage: {
          id: `announcement-${Date.now()}`,
          senderId: 'owner',
          senderName: 'Sunflower 🌻 Owner',
          senderColor: '#f59e0b',
          text: `📢 ${text}`,
          timestamp: Date.now(),
          isSystem: true,
        },
      });
      engine.destroy();
    }
  };

  const handleForcePlayback = (action: 'play' | 'pause') => {
    if (currentRoomId) {
      const engine = new CineSyncEngine(currentRoomId, 'owner-playback');
      engine.broadcast({
        type: action === 'play' ? 'PLAY' : 'PAUSE',
        senderId: 'owner',
        senderName: 'Owner Overlord',
      });
      engine.destroy();
    }
  };

  const handleSpawnTestBot = (botName: string) => {
    const botId = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`;
    const botColor = '#10b981';
    const roomCode = currentRoomId || 'TEST-ROOM';

    trackVisitorJoin(botId, botName, 'bot', roomCode, 'Sunflower Lounge', botColor);

    if (currentRoomId) {
      const engine = new CineSyncEngine(currentRoomId, botId);
      engine.broadcast({
        type: 'USER_JOIN',
        senderId: botId,
        senderName: botName,
      });

      setTimeout(() => {
        engine.broadcast({
          type: 'CHAT',
          senderId: botId,
          senderName: botName,
          chatMessage: {
            id: `msg-${Date.now()}`,
            senderId: botId,
            senderName: botName,
            senderColor: botColor,
            text: `Hey everyone! So excited for movie night on Sunflower 🌻!`,
            timestamp: Date.now(),
          },
        });
      }, 800);

      setTimeout(() => {
        engine.broadcast({
          type: 'REACTION',
          senderId: botId,
          senderName: botName,
          reactionEmoji: '🍿',
        });
        engine.destroy();
      }, 1600);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#07090e] text-slate-100 bg-cinema-grid selection:bg-amber-500/30 selection:text-amber-200">
      {/* Dynamic ambient radial gradients (warm sunflower tones) */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full animate-pulse-subtle"></div>
        <div
          className="absolute top-1/3 right-1/4 w-[500px] h-[400px] bg-yellow-500/6 blur-[160px] rounded-full animate-pulse-subtle"
          style={{ animationDelay: '4s' }}
        ></div>
      </div>

      {/* Top Navbar */}
      <Navbar
        currentRoomId={currentRoomId}
        isOwner={isOwner}
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenJoin={() => {
          setJoinModalInitialCode('');
          setIsJoinInvite(false);
          setIsJoinOpen(true);
        }}
        onOpenGitHubHub={() => setIsGitHubHubOpen(true)}
        onOpenOwnerPanel={() => setIsOwnerPanelOpen(true)}
        onLeaveRoom={handleLeaveRoom}
        onScrollToSection={scrollToSection}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col">
        {isConnectingRoom ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Loader2 className="w-7 h-7 animate-spin" />
            </div>
            <div className="text-center space-y-1">
              <h2 className="text-lg font-bold font-display text-white">Connecting to Watch Party...</h2>
              <p className="text-xs font-mono text-amber-400/90 tracking-wide">
                Verifying Room {connectingRoomCode}
              </p>
            </div>
          </div>
        ) : currentRoomId && currentParticipant ? (
          <WatchRoom
            roomId={currentRoomId}
            roomName={currentRoomName}
            currentParticipant={currentParticipant}
            initialVideoUrl={currentVideoUrl}
            initialVideoTitle={currentVideoTitle}
            onLeaveRoom={handleLeaveRoom}
            onOpenGitHubHub={() => setIsGitHubHubOpen(true)}
            onOpenOwnerPanel={isOwner ? () => setIsOwnerPanelOpen(true) : undefined}
            ownerAnnouncement={ownerAnnouncement}
          />
        ) : (
          <Hero
            onOpenCreate={() => setIsCreateOpen(true)}
            onOpenJoin={() => {
              setJoinModalInitialCode('');
              setIsJoinInvite(false);
              setIsJoinOpen(true);
            }}
            onOpenGitHubHub={() => setIsGitHubHubOpen(true)}
            onQuickLaunchPreset={handleQuickLaunchPreset}
          />
        )}
      </main>

      {/* Footer - only shown on landing page */}
      {!currentRoomId && !isConnectingRoom && (
        <footer className="border-t border-amber-500/15 py-8 px-4 md:px-8 bg-[#05070a] text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-display font-bold text-white">
              <span className="sunflower-sway-icon text-lg">🌻</span>
              <span className="sunflower-animated-title font-extrabold text-sm">Sunflower</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-slate-400 font-sans text-xs font-normal">
                Synchronized Movie Lounge &amp; GitHub Pages Hosting
              </span>
            </div>

            <div className="flex items-center gap-5 text-slate-400">
              {/* Only show owner console in footer if owner */}
              {isOwner && (
                <button
                  onClick={() => setIsOwnerPanelOpen(true)}
                  className="hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer font-semibold text-amber-300/90"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Owner &amp; Dev Console</span>
                </button>
              )}
              <button
                onClick={() => setIsGitHubHubOpen(true)}
                className="hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub Pages Hosting</span>
              </button>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Create Room
              </button>
              <button
                onClick={() => {
                  setJoinModalInitialCode('');
                  setIsJoinInvite(false);
                  setIsJoinOpen(true);
                }}
                className="hover:text-white transition-colors cursor-pointer"
              >
                Join Room
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreateRoom={handleCreateRoom}
      />

      <JoinRoomModal
        isOpen={isJoinOpen}
        initialRoomCode={joinModalInitialCode}
        isInviteLink={isJoinInvite}
        onClose={() => {
          setIsJoinOpen(false);
          setIsJoinInvite(false);
        }}
        onJoinRoom={handleJoinRoom}
      />

      {/* Room Not Found or Expired Modal */}
      {roomNotFoundCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-[#0b0f17] border border-rose-500/30 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden shadow-rose-500/10">
            <div className="px-6 py-5 border-b border-white/8 bg-rose-950/20 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-display font-bold text-base text-white">Room Not Found or Expired</h3>
                <p className="text-xs text-rose-300/80 font-mono">Code: {roomNotFoundCode}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                The watch party room <span className="font-mono text-amber-300 font-semibold">{roomNotFoundCode}</span>{' '}
                does not exist or has already ended. Please double-check your invite link or spin up a new room.
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                <button
                  onClick={() => {
                    setRoomNotFoundCode(null);
                    const cleanPath = window.location.pathname.endsWith('/')
                      ? window.location.pathname
                      : `${window.location.pathname}/`;
                    window.history.pushState({}, '', cleanPath);
                  }}
                  className="flex-1 py-2.5 px-4 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>Return to Lounge</span>
                </button>
                <button
                  onClick={() => {
                    setRoomNotFoundCode(null);
                    const cleanPath = window.location.pathname.endsWith('/')
                      ? window.location.pathname
                      : `${window.location.pathname}/`;
                    window.history.pushState({}, '', cleanPath);
                    setIsCreateOpen(true);
                  }}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Watch Room</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <GitHubHostingModal
        isOpen={isGitHubHubOpen}
        onClose={() => setIsGitHubHubOpen(false)}
        onSelectVideoUrl={(url, title) => {
          if (currentRoomId) {
            setCurrentVideoUrl(url);
            if (title) setCurrentVideoTitle(title);
          } else {
            handleCreateRoom({
              roomCode: generateRoomCode(),
              roomName: title || 'GitHub Movie Party',
              hostName: 'Host',
              videoUrl: url,
              videoTitle: title || 'GitHub Stream',
            });
          }
        }}
      />

      {isOwner && (
        <OwnerPanelModal
          isOpen={isOwnerPanelOpen}
          onClose={() => setIsOwnerPanelOpen(false)}
          currentRoomId={currentRoomId}
          onBroadcastAnnouncement={handleBroadcastAnnouncement}
          onForcePlayback={handleForcePlayback}
          onSpawnTestBot={handleSpawnTestBot}
        />
      )}
    </div>
  );
}
