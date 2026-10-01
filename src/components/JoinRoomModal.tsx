import React, { useState } from 'react';
import { X, LogIn, ArrowRight } from 'lucide-react';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomCode: string, userName: string) => void;
  initialRoomCode?: string;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom,
  initialRoomCode = '',
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [userName, setUserName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !userName.trim()) return;
    onJoinRoom(roomCode.trim().toUpperCase(), userName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b0f17] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between bg-[#0e131d]/60">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400">
              <LogIn className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-display font-bold text-base text-white">Join Watch Party</h2>
              <p className="text-xs text-slate-400">Enter room code and sync with friends.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Room Code (e.g. CINE-XXXXX)
            </label>
            <input
              type="text"
              required
              autoFocus
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="CINE-78K2P"
              className="w-full bg-[#07090e] border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-sm font-mono text-cyan-400 tracking-wider outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Your Nickname
            </label>
            <input
              type="text"
              required
              maxLength={24}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Jordan"
              className="w-full bg-[#07090e] border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Upon joining, you will instantly synchronize video playback, audio timestamp, and live chat with the host.
          </p>

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-pink-500/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Enter Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
