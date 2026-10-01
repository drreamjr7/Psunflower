import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Users,
  Activity,
  Terminal,
  Radio,
  Download,
  Trash2,
  X,
  Play,
  Pause,
  Send,
  Bot,
  RefreshCw,
  ExternalLink,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Sparkles,
  ChevronRight,
  Eye,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { VisitorRecord, OwnerEventLog } from '../types/owner';
import {
  getVisitorHistory,
  getOwnerEvents,
  clearAnalyticsData,
  formatHHMM,
  formatHHMMSS
} from '../services/analyticsTracker';
import { CineSyncEngine } from '../services/syncEngine';

interface OwnerPanelModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRoomId: string | null;
  onBroadcastAnnouncement?: (text: string) => void;
  onForcePlayback?: (action: 'play' | 'pause') => void;
  onSpawnTestBot?: (botName: string) => void;
}

export const OwnerPanelModal: React.FC<OwnerPanelModalProps> = ({
  isOpen,
  onClose,
  currentRoomId,
  onBroadcastAnnouncement,
  onForcePlayback,
  onSpawnTestBot,
}) => {
  const [activeTab, setActiveTab] = useState<'visitors' | 'devtools' | 'events' | 'export'>('visitors');
  const [visitors, setVisitors] = useState<VisitorRecord[]>([]);
  const [events, setEvents] = useState<OwnerEventLog[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<VisitorRecord | null>(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSent, setAnnouncementSent] = useState(false);
  const [simulatedBotCount, setSimulatedBotCount] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const loadData = () => {
      const v = getVisitorHistory();
      setVisitors(v);
      const e = getOwnerEvents();
      setEvents(e);
    };

    loadData();
    const interval = setInterval(loadData, 2000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const totalVisitorsCount = visitors.length;
  const onlineVisitorsCount = visitors.filter(
    (v) => v.isOnline && Date.now() - v.lastActiveAt < 60000
  ).length;
  const totalMessagesCount = visitors.reduce((sum, v) => sum + (v.actionsCount?.messagesSent || 0), 0);
  const totalReactionsCount = visitors.reduce((sum, v) => sum + (v.actionsCount?.reactionsTriggered || 0), 0);

  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    if (onBroadcastAnnouncement) {
      onBroadcastAnnouncement(announcementText.trim());
    }
    setAnnouncementSent(true);
    setAnnouncementText('');
    setTimeout(() => setAnnouncementSent(false), 3000);
  };

  const handleSpawnBot = (name: string) => {
    if (onSpawnTestBot) {
      onSpawnTestBot(name);
      setSimulatedBotCount((c) => c + 1);
    }
  };

  const handleClearAll = () => {
    if (confirm('Clear all visitor intelligence and logs from local storage?')) {
      clearAnalyticsData();
      setVisitors([]);
      setEvents([]);
      setSelectedVisitor(null);
    }
  };

  const handleExportJSON = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      appName: 'Sunflower 🌻',
      summary: {
        totalVisitors: totalVisitorsCount,
        activeOnline: onlineVisitorsCount,
        totalMessages: totalMessagesCount,
      },
      visitors,
      events,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunflower-analytics-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = [
      'ID',
      'Name',
      'Role',
      'RoomCode',
      'FirstSeen',
      'LastActive',
      'Browser',
      'OS',
      'DeviceType',
      'ScreenResolution',
      'LocationTimeZone',
      'MessagesCount',
      'ReactionsCount',
    ];
    const rows = visitors.map((v) => [
      v.id,
      `"${v.name}"`,
      v.role,
      v.roomCode,
      new Date(v.firstSeenAt).toISOString(),
      new Date(v.lastActiveAt).toISOString(),
      v.browser,
      v.os,
      v.deviceType,
      `"${v.screenResolution}"`,
      `"${v.locationEstimate}"`,
      v.actionsCount?.messagesSent || 0,
      v.actionsCount?.reactionsTriggered || 0,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sunflower-visitors-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b0d14] border border-amber-500/30 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto max-h-[94vh] flex flex-col ring-1 ring-amber-400/20">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between bg-[#111420]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-amber-500/25">
              <ShieldCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display font-extrabold text-lg text-white">
                  Sunflower <span className="sunflower-sway-icon">🌻</span> Owner &amp; Dev Console
                </h2>
                <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-950/80 border border-amber-500/40 px-2 py-0.5 rounded tracking-wide">
                  SUPERUSER LEVEL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Live visitor tracking, room telemetries, simulator bots, and master playback controls.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Intelligence Metric Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-[#080a10] border-b border-white/8 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px]">TOTAL VISITORS</span>
              <span className="font-bold text-white text-sm tabular-nums">{totalVisitorsCount} Recorded</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px]">ACTIVE SESSIONS</span>
              <span className="font-bold text-emerald-400 text-sm tabular-nums">
                {onlineVisitorsCount || 1} Online
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Activity className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px]">TOTAL CHATS</span>
              <span className="font-bold text-white text-sm tabular-nums">{totalMessagesCount} Messages</span>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
            <div>
              <span className="text-slate-400 block text-[10px]">REACTIONS BURST</span>
              <span className="font-bold text-white text-sm tabular-nums">{totalReactionsCount} Emojis</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-white/8 flex items-center gap-2 overflow-x-auto bg-[#0a0d16] shrink-0">
          <button
            onClick={() => setActiveTab('visitors')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'visitors'
                ? 'text-amber-400 border-amber-400 bg-white/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Joined Visitors Intelligence ({visitors.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('devtools')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'devtools'
                ? 'text-amber-400 border-amber-400 bg-white/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Dev Tools &amp; Bot Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('events')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'events'
                ? 'text-amber-400 border-amber-400 bg-white/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live Telemetry Bus ({events.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('export')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'export'
                ? 'text-amber-400 border-amber-400 bg-white/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Audit &amp; Export</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: VISITOR INTELLIGENCE */}
          {activeTab === 'visitors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-sm text-white">
                    Detailed Roster of Users Who Joined Sunflower
                  </h3>
                  <p className="text-xs text-slate-400">
                    Captures connection timestamps, operating systems, browsers, screen dimensions, and action logs.
                  </p>
                </div>
                <button
                  onClick={() => setVisitors(getVisitorHistory())}
                  className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-amber-400" />
                  <span>Refresh List</span>
                </button>
              </div>

              {visitors.length === 0 ? (
                <div className="p-8 text-center bg-[#0e121e] border border-white/8 rounded-xl text-slate-400 space-y-2">
                  <Users className="w-8 h-8 text-amber-400/50 mx-auto" />
                  <p className="text-xs">No external visitors recorded yet.</p>
                  <p className="text-[11px] text-slate-500">
                    Open Sunflower in another browser tab or share the link to see visitors appear live.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left Column: Visitor Table */}
                  <div className="lg:col-span-8 overflow-x-auto">
                    <table className="w-full text-left text-xs border border-white/8 rounded-xl overflow-hidden bg-[#0d101a]">
                      <thead className="bg-[#131726] text-slate-400 font-mono text-[11px] border-b border-white/8">
                        <tr>
                          <th className="py-2.5 px-3">Participant</th>
                          <th className="py-2.5 px-3">Status / Role</th>
                          <th className="py-2.5 px-3">Device &amp; Browser</th>
                          <th className="py-2.5 px-3">Joined Time</th>
                          <th className="py-2.5 px-3">Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {visitors.map((v) => {
                          const isRecent = Date.now() - v.lastActiveAt < 90000;
                          return (
                            <tr
                              key={v.id}
                              onClick={() => setSelectedVisitor(v)}
                              className={`cursor-pointer transition-colors hover:bg-amber-500/10 ${
                                selectedVisitor?.id === v.id ? 'bg-amber-500/15' : ''
                              }`}
                            >
                              <td className="py-3 px-3">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-slate-950 text-xs shrink-0"
                                    style={{ backgroundColor: v.color || '#fbbf24' }}
                                  >
                                    {v.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="min-w-0">
                                    <span className="font-bold text-white block truncate">{v.name}</span>
                                    <span className="text-[10px] font-mono text-slate-500 truncate block">
                                      Room: {v.roomCode}
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="flex flex-col gap-1">
                                  <span className="flex items-center gap-1.5 text-[11px]">
                                    <span
                                      className={`w-2 h-2 rounded-full ${
                                        isRecent ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                                      }`}
                                    ></span>
                                    <span className={isRecent ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>
                                      {isRecent ? 'Online' : 'Idle / Left'}
                                    </span>
                                  </span>
                                  <span className="text-[10px] uppercase font-mono text-amber-400/90 font-medium">
                                    {v.role}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-1 text-slate-200">
                                    {v.deviceType === 'Mobile' ? (
                                      <Smartphone className="w-3 h-3 text-cyan-400" />
                                    ) : v.deviceType === 'Tablet' ? (
                                      <Tablet className="w-3 h-3 text-cyan-400" />
                                    ) : (
                                      <Laptop className="w-3 h-3 text-cyan-400" />
                                    )}
                                    <span>{v.os}</span>
                                    <span className="text-slate-500">&bull;</span>
                                    <span>{v.browser}</span>
                                  </div>
                                  <span className="text-[10px] font-mono text-slate-500 block">
                                    {v.screenResolution.split(' ')[0]}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-3 font-mono text-slate-300 tabular-nums">
                                <span className="block font-bold text-amber-300">{formatHHMM(v.firstSeenAt)}</span>
                                <span className="text-[10px] text-slate-500">{new Date(v.firstSeenAt).toLocaleDateString()}</span>
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                                <span className="block text-slate-300">
                                  {v.actionsCount?.messagesSent || 0} msgs &bull; {v.actionsCount?.reactionsTriggered || 0} reacts
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {v.actionsCount?.videoSeeks || 0} seeks &bull; {v.actionsCount?.videoPlays || 0} plays
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Right Column: Selected Visitor Detail Inspector */}
                  <div className="lg:col-span-4 bg-[#0d101a] border border-white/8 rounded-xl p-4 space-y-4">
                    {selectedVisitor ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2.5 pb-3 border-b border-white/8">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-slate-950 text-base"
                            style={{ backgroundColor: selectedVisitor.color || '#fbbf24' }}
                          >
                            {selectedVisitor.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-sm">{selectedVisitor.name}</h4>
                            <span className="text-xs text-amber-400 font-mono">
                              Role: {selectedVisitor.role.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div>
                            <span className="text-slate-500 text-[10px] block font-mono">INTERNAL USER ID</span>
                            <span className="font-mono text-slate-300 text-[11px] break-all">
                              {selectedVisitor.id}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block font-mono">ROOM CODE &amp; NAME</span>
                            <span className="text-white font-medium">
                              {selectedVisitor.roomName} ({selectedVisitor.roomCode})
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block font-mono">SCREEN RESOLUTION</span>
                            <span className="font-mono text-slate-300">{selectedVisitor.screenResolution}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] block font-mono">TIMEZONE / REGION</span>
                            <span className="text-cyan-300 font-mono">{selectedVisitor.locationEstimate}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/8">
                          <span className="text-[10px] font-mono text-slate-400 block mb-1">
                            RECENT ACTIVITY LOG
                          </span>
                          <div className="space-y-1 max-h-36 overflow-y-auto text-[11px] font-mono text-slate-400 bg-black/40 p-2 rounded-lg">
                            {selectedVisitor.recentLogs?.map((log, idx) => (
                              <div key={idx} className="text-slate-300 truncate">
                                &bull; {log}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500 space-y-2">
                        <Eye className="w-6 h-6 text-slate-600" />
                        <p className="text-xs">Click any participant on the left to inspect detailed telemetries.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DEV TOOLS & BOT SIMULATOR */}
          {activeTab === 'devtools' && (
            <div className="space-y-6">
              {/* Tool 1: Broadcast announcement banner */}
              <div className="bg-[#0e121e] border border-white/8 p-4 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-amber-400" />
                  <h4 className="font-display font-bold text-sm text-white">
                    Send Global Owner Announcement Banner
                  </h4>
                </div>
                <p className="text-xs text-slate-400">
                  Transmits an urgent golden notification to every client connected to room{' '}
                  <code className="text-amber-300 font-mono">{currentRoomId || 'ALL'}</code>.
                </p>
                <form onSubmit={handleSendAnnouncement} className="flex gap-2">
                  <input
                    type="text"
                    value={announcementText}
                    onChange={(e) => setAnnouncementText(e.target.value)}
                    placeholder="e.g. 🌻 Owner Notice: Movie starting in 2 minutes, grab your popcorn!"
                    className="flex-1 bg-[#06080e] border border-white/10 focus:border-amber-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Broadcast</span>
                  </button>
                </form>
                {announcementSent && (
                  <p className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" /> Announcement dispatched to all room peers!
                  </p>
                )}
              </div>

              {/* Tool 2: Bot Simulator */}
              <div className="bg-[#0e121e] border border-white/8 p-4 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-cyan-400" />
                    <h4 className="font-display font-bold text-sm text-white">
                      Simulated Peer Generator (Test Multi-User Locally)
                    </h4>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 px-2 py-0.5 rounded">
                    Bots Spawned: {simulatedBotCount}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Inject simulated participants into your watch room. They immediately join, send chat messages with formatted timestamps (HH:MM), and burst reactions.
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <button
                    onClick={() => handleSpawnBot('Luna 🌻')}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-amber-400" />
                    <span>Spawn &quot;Luna 🌻&quot;</span>
                  </button>
                  <button
                    onClick={() => handleSpawnBot('Sam (Popcorn fan)')}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-pink-400" />
                    <span>Spawn &quot;Sam 🍿&quot;</span>
                  </button>
                  <button
                    onClick={() => handleSpawnBot('Leo (Cinema Critic)')}
                    className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs text-white font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Bot className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Spawn &quot;Leo 🎬&quot;</span>
                  </button>
                </div>
              </div>

              {/* Tool 3: Master Playback Overlord */}
              <div className="bg-[#0e121e] border border-white/8 p-4 rounded-xl space-y-3">
                <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400" />
                  <span>Master Playback Control</span>
                </h4>
                <p className="text-xs text-slate-400">
                  Override all room players simultaneously.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onForcePlayback && onForcePlayback('play')}
                    className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Force Play All</span>
                  </button>
                  <button
                    onClick={() => onForcePlayback && onForcePlayback('pause')}
                    className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-semibold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Force Pause All</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LIVE TELEMETRY BUS */}
          {activeTab === 'events' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-sm text-white">
                    Raw Real-Time Event Bus Stream
                  </h3>
                  <p className="text-xs text-slate-400">
                    Chronological packets traversing BroadcastChannel &amp; local bus in real-time.
                  </p>
                </div>
                <button
                  onClick={() => setEvents(getOwnerEvents())}
                  className="px-3 py-1 text-xs bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3 text-amber-400" />
                  <span>Update Events</span>
                </button>
              </div>

              <div className="p-3 bg-[#06080e] border border-white/8 rounded-xl max-h-96 overflow-y-auto space-y-2 font-mono text-xs">
                {events.length === 0 ? (
                  <p className="text-slate-500 text-center py-6">No packet events captured yet.</p>
                ) : (
                  events.map((evt) => (
                    <div
                      key={evt.id}
                      className="p-2 rounded bg-[#0d101a] border border-white/5 flex items-start justify-between gap-3 text-[11px]"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-400">{evt.type}</span>
                          <span className="text-slate-400">&bull;</span>
                          <span className="text-slate-200">{evt.senderName}</span>
                          <span className="text-slate-500 font-normal">({evt.roomCode})</span>
                        </div>
                        <p className="text-slate-400 text-xs break-all">{evt.summary}</p>
                      </div>
                      <span className="text-slate-500 text-[10px] shrink-0 tabular-nums">
                        {formatHHMMSS(evt.timestamp)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT & EXPORT */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-display font-bold text-sm text-white">
                  Export Visitor Intelligence &amp; Audit Logs
                </h3>
                <p className="text-xs text-slate-400">
                  Download full raw records for forensic review, security verification, or party archives.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-[#0e121e] border border-white/8 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs text-white">JSON Forensic Bundle</h4>
                  <p className="text-xs text-slate-400">
                    Complete nested JSON structure with all visitor objects, device telemetry, and events.
                  </p>
                  <button
                    onClick={handleExportJSON}
                    className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON ({visitors.length} records)</span>
                  </button>
                </div>

                <div className="p-4 bg-[#0e121e] border border-white/8 rounded-xl space-y-2">
                  <h4 className="font-bold text-xs text-white">CSV Spreadsheet</h4>
                  <p className="text-xs text-slate-400">
                    Flat CSV spreadsheet format compatible with Excel, Google Sheets, and Numbers.
                  </p>
                  <button
                    onClick={handleExportCSV}
                    className="w-full py-2 bg-white/10 hover:bg-white/15 text-white font-bold border border-white/15 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download CSV Report</span>
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/8">
                <h4 className="text-xs font-bold text-rose-400 mb-2">Danger Zone</h4>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 rounded-lg text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge Visitor Database &amp; Local Storage</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/8 bg-[#080a10] flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono text-[11px] text-amber-400/90">
            Sunflower 🌻 Protected Superuser Console
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-lg transition-colors cursor-pointer"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
