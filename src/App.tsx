import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { WatchRoom } from './components/WatchRoom';
import { CreateRoomModal } from './components/CreateRoomModal';
import { JoinRoomModal } from './components/JoinRoomModal';
import { GitHubHostingModal } from './components/GitHubHostingModal';
import { OwnerPanelModal } from './components/OwnerPanelModal';
import { Participant, VideoPreset, SyncPayload } from './types/party';
import { VIDEO_PRESETS } from './data/videoPresets';
import { generateRoomCode, getRandomColor, CineSyncEngine } from './services/syncEngine';
import { trackVisitorJoin, logOwnerEvent, formatHHMM } from './services/analyticsTracker';
import { Film, Github, Sparkles, Heart, ShieldCheck } from 'lucide-react';

export default function App() {
  // Navigation / Room State
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [currentRoomName, setCurrentRoomName] = useState<string>('Sunflower Cinema Lounge');
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null);
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(VIDEO_PRESETS[0].url);
  const [currentVideoTitle, setCurrentVideoTitle] = useState<string>(VIDEO_PRESETS[0].title);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [joinModalInitialCode, setJoinModalInitialCode] = useState('');
  const [isGitHubHubOpen, setIsGitHubHubOpen] = useState(false);
  const [isOwnerPanelOpen, setIsOwnerPanelOpen] = useState(false);
  const [ownerAnnouncement, setOwnerAnnouncement] = useState<string | null>(null);

  // Keyboard shortcut for Owner Panel (Ctrl+Shift+D or Alt+O)
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) || (e.altKey && (e.key === 'o' || e.key === 'O'))) {
        e.preventDefault();
        setIsOwnerPanelOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Listen for hash changes (e.g. #room=CINE-12345)
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      const match = hash.match(/room=([^&]+)/);
      if (match && match[1]) {
        const code = match[1].toUpperCase();
        if (!currentRoomId) {
          setJoinModalInitialCode(code);
          setIsJoinOpen(true);
        }
      }
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [currentRoomId]);

  // Handle Room Creation
  const handleCreateRoom = ({
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
    const participant: Participant = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: hostName,
      color: '#f59e0b',
      isHost: true,
      avatarSeed: hostName,
      joinedAt: Date.now(),
      lastPing: Date.now(),
    };

    // Track visitor join in owner analytics
    trackVisitorJoin(participant.id, hostName, 'owner', roomCode, roomName, participant.color);

    setCurrentParticipant(participant);
    setCurrentRoomId(roomCode);
    setCurrentRoomName(roomName);
    setCurrentVideoUrl(videoUrl);
    setCurrentVideoTitle(videoTitle);
    setIsCreateOpen(false);

    window.location.hash = `room=${roomCode}`;
  };

  // Handle Join Room
  const handleJoinRoom = (roomCode: string, userName: string) => {
    const participant: Participant = {
      id: `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: userName,
      color: getRandomColor(),
      isHost: false,
      avatarSeed: userName,
      joinedAt: Date.now(),
      lastPing: Date.now(),
    };

    // Track visitor join in owner analytics
    trackVisitorJoin(participant.id, userName, 'guest', roomCode, `Room ${roomCode}`, participant.color);

    setCurrentParticipant(participant);
    setCurrentRoomId(roomCode);
    setCurrentRoomName(`Sunflower Room ${roomCode}`);
    setCurrentVideoUrl(VIDEO_PRESETS[0].url);
    setCurrentVideoTitle(VIDEO_PRESETS[0].title);
    setIsJoinOpen(false);

    window.location.hash = `room=${roomCode}`;
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
    window.location.hash = '';
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

    // 1. Track in analytics
    trackVisitorJoin(botId, botName, 'bot', roomCode, 'Sunflower Lounge', botColor);

    // 2. Broadcast join event and chat
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
        onOpenCreate={() => setIsCreateOpen(true)}
        onOpenJoin={() => {
          setJoinModalInitialCode('');
          setIsJoinOpen(true);
        }}
        onOpenGitHubHub={() => setIsGitHubHubOpen(true)}
        onOpenOwnerPanel={() => setIsOwnerPanelOpen(true)}
        onLeaveRoom={handleLeaveRoom}
        onScrollToSection={scrollToSection}
      />

      {/* Main Container */}
      <main className="flex-1 flex flex-col">
        {currentRoomId && currentParticipant ? (
          <WatchRoom
            roomId={currentRoomId}
            roomName={currentRoomName}
            currentParticipant={currentParticipant}
            initialVideoUrl={currentVideoUrl}
            initialVideoTitle={currentVideoTitle}
            onLeaveRoom={handleLeaveRoom}
            onOpenGitHubHub={() => setIsGitHubHubOpen(true)}
            onOpenOwnerPanel={() => setIsOwnerPanelOpen(true)}
            ownerAnnouncement={ownerAnnouncement}
          />
        ) : (
          <Hero
            onOpenCreate={() => setIsCreateOpen(true)}
            onOpenJoin={() => {
              setJoinModalInitialCode('');
              setIsJoinOpen(true);
            }}
            onOpenGitHubHub={() => setIsGitHubHubOpen(true)}
            onQuickLaunchPreset={handleQuickLaunchPreset}
          />
        )}
      </main>

      {/* Footer - only shown on landing page */}
      {!currentRoomId && (
        <footer className="border-t border-amber-500/15 py-8 px-4 md:px-8 bg-[#05070a] text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 font-display font-bold text-white">
              <span className="sunflower-sway-icon text-lg">🌻</span>
              <span className="sunflower-animated-title font-extrabold text-sm">Sunflower</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-slate-400 font-sans text-xs font-normal">
                Synchronized Movie Lounge &amp; GitHub Pages Toolkit
              </span>
            </div>

            <div className="flex items-center gap-5 text-slate-400">
              <button
                onClick={() => setIsOwnerPanelOpen(true)}
                className="hover:text-amber-400 transition-colors flex items-center gap-1 cursor-pointer font-semibold text-amber-300/90"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Owner &amp; Dev Console</span>
              </button>
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
        onClose={() => setIsJoinOpen(false)}
        onJoinRoom={handleJoinRoom}
      />

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

      <OwnerPanelModal
        isOpen={isOwnerPanelOpen}
        onClose={() => setIsOwnerPanelOpen(false)}
        currentRoomId={currentRoomId}
        onBroadcastAnnouncement={handleBroadcastAnnouncement}
        onForcePlayback={handleForcePlayback}
        onSpawnTestBot={handleSpawnTestBot}
      />
    </div>
  );
}
