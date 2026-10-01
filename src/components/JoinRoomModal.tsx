import React, { useState, useEffect } from 'react';
import { X, LogIn, ArrowRight, AlertCircle, CheckCircle, Loader2, Sparkles } from 'lucide-react';
import { getRoomFromFirebase, FirebaseRoom } from '../services/firebase';

interface JoinRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinRoom: (roomCode: string, userName: string) => void;
  initialRoomCode?: string;
  isInviteLink?: boolean;
}

export const JoinRoomModal: React.FC<JoinRoomModalProps> = ({
  isOpen,
  onClose,
  onJoinRoom,
  initialRoomCode = '',
  isInviteLink = false,
}) => {
  const [roomCode, setRoomCode] = useState(initialRoomCode || '');
  const [userName, setUserName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedRoom, setVerifiedRoom] = useState<FirebaseRoom | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  useEffect(() => {
    if (initialRoomCode) {
      const code = initialRoomCode.trim().toUpperCase();
      setRoomCode(code);
      verifyRoom(code);
    } else {
      setVerifiedRoom(null);
      setLookupError(null);
    }
  }, [initialRoomCode, isOpen]);

  const verifyRoom = async (code: string) => {
    if (!code || code.length < 3) {
      setVerifiedRoom(null);
      setLookupError(null);
      return;
    }

    setIsVerifying(true);
    setLookupError(null);

    try {
      const room = await getRoomFromFirebase(code);
      if (room) {
        setVerifiedRoom(room);
        setLookupError(null);
      } else {
        setVerifiedRoom(null);
        setLookupError('Room not found or expired. Please check the link or room code.');
      }
    } catch {
      setLookupError('Unable to connect to room server. Please check your connection.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim() || !userName.trim()) return;
    onJoinRoom(roomCode.trim().toUpperCase(), userName.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md">
      <div className="bg-[#0b0f17] border border-amber-500/20 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden shadow-amber-500/5">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between bg-[#0e131d]/60">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <LogIn className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-display font-bold text-base text-white flex items-center gap-1.5">
                <span>Join Watch Party</span>
                <span className="text-sm">🌻</span>
              </h2>
              <p className="text-xs text-slate-400">
                {isInviteLink ? 'You were invited to a watch party room.' : 'Enter room code and sync with friends.'}
              </p>
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
              Room Code (e.g. SUN-XXXXX)
            </label>
            <div className="relative">
              <input
                type="text"
                required
                readOnly={isInviteLink && !!initialRoomCode}
                value={roomCode}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setRoomCode(val);
                  if (val.length >= 4) verifyRoom(val);
                }}
                placeholder="SUN-78K2P"
                className={`w-full bg-[#07090e] border ${
                  lookupError
                    ? 'border-rose-500/60 text-rose-300'
                    : verifiedRoom
                    ? 'border-emerald-500/60 text-amber-300'
                    : 'border-white/15 focus:border-amber-400 text-amber-300'
                } rounded-lg px-3 py-2 text-sm font-mono tracking-wider outline-none ${
                  isInviteLink && !!initialRoomCode ? 'bg-amber-950/20' : ''
                }`}
              />
              {isVerifying && (
                <div className="absolute right-3 top-2.5">
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                </div>
              )}
            </div>

            {/* Room verification status */}
            {verifiedRoom && (
              <div className="mt-2 p-2.5 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-start gap-2 text-xs text-emerald-300">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white truncate">{verifiedRoom.roomName}</p>
                  <p className="text-[11px] text-emerald-300/80">
                    Host: <span className="text-white font-medium">{verifiedRoom.hostName}</span> &bull; Playing:{' '}
                    <span className="text-white font-medium truncate">{verifiedRoom.videoTitle || 'Movie'}</span>
                  </p>
                </div>
              </div>
            )}

            {lookupError && (
              <div className="mt-2 p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-lg flex items-center gap-2 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{lookupError}</span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Your Nickname
            </label>
            <input
              type="text"
              required
              autoFocus
              maxLength={24}
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Jordan"
              className="w-full bg-[#07090e] border border-white/15 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
            />
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Upon joining, you will instantly synchronize video playback, audio timestamp, and live chat with the host in real-time.
          </p>

          <button
            type="submit"
            disabled={isVerifying || !!lookupError}
            className={`w-full py-2.5 px-4 ${
              lookupError
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold shadow-lg shadow-amber-500/20 cursor-pointer'
            } rounded-xl text-sm transition-all flex items-center justify-center gap-2`}
          >
            <span>Enter Room</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
