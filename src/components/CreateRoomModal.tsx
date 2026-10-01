import React, { useState } from 'react';
import { X, Film, Link as LinkIcon, Upload, Sparkles, Check, Copy } from 'lucide-react';
import { VIDEO_PRESETS } from '../data/videoPresets';
import { VideoPreset } from '../types/party';
import { normalizeVideoUrl, generateRoomCode } from '../services/syncEngine';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateRoom: (params: {
    roomCode: string;
    roomName: string;
    hostName: string;
    videoUrl: string;
    videoTitle: string;
  }) => void;
}

export const CreateRoomModal: React.FC<CreateRoomModalProps> = ({
  isOpen,
  onClose,
  onCreateRoom,
}) => {
  const [sourceType, setSourceType] = useState<'preset' | 'url' | 'local'>('preset');
  const [hostName, setHostName] = useState('Alex');
  const [roomName, setRoomName] = useState('Friday Movie Night');
  const [selectedPreset, setSelectedPreset] = useState<VideoPreset>(VIDEO_PRESETS[0]);
  const [customUrl, setCustomUrl] = useState('');
  const [localFileName, setLocalFileName] = useState('');
  const [localFileUrl, setLocalFileUrl] = useState('');
  const [roomCode] = useState(() => generateRoomCode());
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objUrl = URL.createObjectURL(file);
      setLocalFileName(file.name);
      setLocalFileUrl(objUrl);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hostName.trim()) return;

    let finalVideoUrl = '';
    let finalTitle = '';

    if (sourceType === 'preset') {
      finalVideoUrl = selectedPreset.url;
      finalTitle = selectedPreset.title;
    } else if (sourceType === 'url') {
      if (!customUrl.trim()) return;
      finalVideoUrl = normalizeVideoUrl(customUrl);
      finalTitle = 'Custom Stream';
    } else if (sourceType === 'local') {
      if (!localFileUrl) return;
      finalVideoUrl = localFileUrl;
      finalTitle = localFileName || 'Local Movie';
    }

    onCreateRoom({
      roomCode,
      roomName: roomName.trim() || 'Watch Party',
      hostName: hostName.trim(),
      videoUrl: finalVideoUrl,
      videoTitle: finalTitle,
    });
  };

  const inviteLink = `${window.location.origin}${window.location.pathname}#room=${roomCode}`;

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b0f17] border border-white/10 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between bg-[#0e131d]/60">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Film className="w-4 h-4" />
            </span>
            <div>
              <h2 className="font-display font-bold text-base text-white">Create Watch Party</h2>
              <p className="text-xs text-slate-400">Setup synchronized playback &amp; invite your group.</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Your Nickname
              </label>
              <input
                type="text"
                required
                maxLength={24}
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full bg-[#07090e] border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Party Room Title
              </label>
              <input
                type="text"
                maxLength={30}
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Sci-Fi Saturday"
                className="w-full bg-[#07090e] border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
              />
            </div>
          </div>

          {/* Video Source Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Video Source
            </label>
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#07090e] border border-white/10 rounded-lg mb-3">
              <button
                type="button"
                onClick={() => setSourceType('preset')}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  sourceType === 'preset'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Film className="w-3 h-3" />
                <span>Presets</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('url')}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  sourceType === 'url'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LinkIcon className="w-3 h-3" />
                <span>URL / GitHub</span>
              </button>
              <button
                type="button"
                onClick={() => setSourceType('local')}
                className={`py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  sourceType === 'local'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Upload className="w-3 h-3" />
                <span>Local File</span>
              </button>
            </div>

            {/* Presets list */}
            {sourceType === 'preset' && (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {VIDEO_PRESETS.map((preset) => (
                  <div
                    key={preset.id}
                    onClick={() => setSelectedPreset(preset)}
                    className={`p-2.5 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                      selectedPreset.id === preset.id
                        ? 'border-cyan-400 bg-cyan-950/20 ring-1 ring-cyan-400/30'
                        : 'border-white/10 bg-[#0e131d]/60 hover:border-white/20'
                    }`}
                  >
                    <img
                      src={preset.thumbnail}
                      alt={preset.title}
                      className="w-16 h-10 object-cover rounded-lg shrink-0 border border-white/10"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white truncate">{preset.title}</span>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">{preset.duration}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1.5 truncate">
                        <span>{preset.creator}</span>
                        <span>&bull;</span>
                        <span className="text-cyan-400/90">{preset.resolution}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* URL input */}
            {sourceType === 'url' && (
              <div className="space-y-2">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/video.mp4 or github.com/user/repo/blob/..."
                  className="w-full bg-[#07090e] border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
                />
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Supports direct MP4/WebM URLs and GitHub repository links (automatically converted to raw direct streaming).
                </p>
              </div>
            )}

            {/* Local File input */}
            {sourceType === 'local' && (
              <div className="p-4 border border-dashed border-white/15 rounded-xl bg-[#07090e] text-center space-y-2">
                <input
                  type="file"
                  id="localVideoFileInput"
                  accept="video/mp4,video/webm,video/ogg"
                  onChange={handleLocalFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="localVideoFileInput"
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white rounded-lg cursor-pointer transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Choose Video File from Computer</span>
                </label>
                {localFileName ? (
                  <p className="text-xs text-cyan-300 font-medium truncate">Selected: {localFileName}</p>
                ) : (
                  <p className="text-[11px] text-slate-400">
                    Play your own movie file without uploading to any server!
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Room ID and Invite Link */}
          <div className="p-3 bg-[#07090e] border border-white/10 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400 block">
                Generated Room Code
              </span>
              <span className="text-sm font-mono font-bold text-cyan-400 tracking-wider">
                {roomCode}
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="px-2.5 py-1 text-xs bg-white/5 hover:bg-white/10 border border-white/10 rounded-md text-slate-300 flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy Link'}</span>
            </button>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20 cursor-pointer"
          >
            Launch Synchronized Room
          </button>
        </form>
      </div>
    </div>
  );
};
