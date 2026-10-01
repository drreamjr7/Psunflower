import React from 'react';
import { Github, LogIn, Plus, Download, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  currentRoomId: string | null;
  isOwner?: boolean;
  onOpenCreate: () => void;
  onOpenJoin: () => void;
  onOpenGitHubHub: () => void;
  onOpenOwnerPanel: () => void;
  onLeaveRoom: () => void;
  onScrollToSection: (sectionId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRoomId,
  isOwner = true,
  onOpenCreate,
  onOpenJoin,
  onOpenGitHubHub,
  onOpenOwnerPanel,
  onLeaveRoom,
  onScrollToSection,
}) => {
  return (
    <header className="h-16 border-b border-amber-500/20 backdrop-blur-xl bg-[#08090f]/90 sticky top-0 z-40 px-4 md:px-8 flex items-center justify-between transition-all">
      {/* Zone 1: Single text element wordmark with stylish Sunflower 🌻 animation */}
      <a
        href="#"
        onClick={(e) => {
          e.preventDefault();
          if (currentRoomId) {
            onLeaveRoom();
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }}
        className="font-display text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2 group cursor-pointer sunflower-bloom-hover select-none"
      >
        <span className="sunflower-sway-icon text-2xl sm:text-3xl filter drop-shadow-[0_0_12px_rgba(251,191,36,0.6)]">
          🌻
        </span>
        <span className="sunflower-animated-title font-extrabold tracking-tight">
          Sunflower
        </span>
      </a>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
        <button
          onClick={() => onScrollToSection('hero-section')}
          className="hover:text-amber-300 transition-colors cursor-pointer text-left"
        >
          Watch Party
        </button>
        <button
          onClick={onOpenGitHubHub}
          className="hover:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer text-left"
        >
          <Github className="w-3.5 h-3.5 text-amber-400" />
          <span>GitHub Hosting</span>
        </button>
        <button
          onClick={() => onScrollToSection('presets-section')}
          className="hover:text-amber-300 transition-colors cursor-pointer text-left"
        >
          Featured Cinema
        </button>
        <button
          onClick={() => onScrollToSection('sync-engine-section')}
          className="hover:text-amber-300 transition-colors cursor-pointer text-left"
        >
          Sync Engine
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-2">
        {/* Owner Panel Button - only for Owner */}
        {isOwner && (
          <button
            onClick={onOpenOwnerPanel}
            title="Open Sunflower Owner & Dev Console"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/35 hover:border-amber-400 rounded-lg transition-all cursor-pointer shadow-sm shadow-amber-500/10"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Owner Panel</span>
          </button>
        )}

        {currentRoomId ? (
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1.5 rounded-md">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              <span>ROOM: {currentRoomId}</span>
            </div>
            <button
              onClick={onOpenGitHubHub}
              title="Download & GitHub Hub"
              className="p-2 text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
            >
              <Download className="w-4 h-4 text-amber-400" />
            </button>
            <button
              onClick={onLeaveRoom}
              className="px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors cursor-pointer"
            >
              Exit Party
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenGitHubHub}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 border border-amber-500/30 hover:border-amber-400 bg-amber-500/10 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download ZIP</span>
            </button>
            <button
              onClick={onOpenJoin}
              className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white border border-white/10 hover:border-amber-500/40 bg-white/5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Join</span>
            </button>
            <button
              onClick={onOpenCreate}
              className="px-3.5 py-1.5 text-xs font-bold text-slate-950 bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 rounded-lg shadow-md shadow-amber-500/25 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Host Room</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
