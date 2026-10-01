import React from 'react';
import {
  Play,
  LogIn,
  Github,
  Film,
  Sparkles,
  Users,
  MessageSquare,
  ShieldCheck,
  Zap,
  Globe,
  Sliders,
  Check,
  ArrowRight
} from 'lucide-react';
import { VIDEO_PRESETS } from '../data/videoPresets';
import { VideoPreset } from '../types/party';
import heroCinemaImg from '../assets/images/hero_cinema_ambient_1790750903149.jpg';
import githubTechImg from '../assets/images/github_hosting_concept_1790750957667.jpg';

interface HeroProps {
  onOpenCreate: () => void;
  onOpenJoin: () => void;
  onOpenGitHubHub: () => void;
  onQuickLaunchPreset: (preset: VideoPreset) => void;
}

export const Hero: React.FC<HeroProps> = ({
  onOpenCreate,
  onOpenJoin,
  onOpenGitHubHub,
  onQuickLaunchPreset,
}) => {
  return (
    <div className="space-y-24 pb-20">
      {/* SECTION 1: HERO VIEWPORT */}
      <section id="hero-section" className="relative pt-12 md:pt-20 px-4 md:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Headline and Call-to-actions */}
          <div className="lg:col-span-6 space-y-6">
            {/* Clean unboxed text kicker */}
            <div className="flex items-center gap-2 text-xs font-mono text-amber-400">
              <span>SUNFLOWER 🌻 CINEMA</span>
              <span aria-hidden="true">&bull;</span>
              <span>SYNCHRONIZED MOVIE NIGHT</span>
              <span aria-hidden="true">&bull;</span>
              <span>GITHUB PAGES HOSTED</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.08] text-balance">
              <span className="sunflower-animated-title inline-block">
                Sunflower
              </span>{' '}
              <span className="sunflower-sway-icon text-4xl sm:text-5xl md:text-6xl align-middle">
                🌻
              </span>
              <br />
              <span className="text-white text-3xl sm:text-4xl md:text-5xl font-bold opacity-90">
                Synchronized Movie Lounge.
              </span>
            </h1>

            <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-xl">
              Watch movies together in real-time harmony with frame-accurate video synchronization, legible HH:MM live chat, ambient theater lighting, and built-in Owner Intelligence.
            </p>

            {/* Action buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={onOpenCreate}
                className="py-3 px-6 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-extrabold rounded-xl text-sm transition-all shadow-xl shadow-amber-500/25 flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Host Watch Party</span>
              </button>

              <button
                onClick={onOpenJoin}
                className="py-3 px-5 bg-white/5 hover:bg-white/10 border border-white/15 hover:border-amber-400/40 text-white font-semibold rounded-xl text-sm transition-all flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-amber-400" />
                <span>Join with Code</span>
              </button>

              <button
                onClick={onOpenGitHubHub}
                className="py-3 px-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/25 text-slate-300 hover:text-white font-medium rounded-xl text-sm transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Github className="w-4 h-4 text-amber-400" />
                <span>GitHub Hosting</span>
              </button>
            </div>

            {/* Proof Metadata: Clean unboxed stats with separators */}
            <div className="pt-4 border-t border-white/8 flex items-center gap-6 text-xs text-slate-400 font-mono">
              <div>
                <strong className="text-amber-300 font-bold block text-sm">&lt; 80ms</strong>
                <span>Sync Latency</span>
              </div>
              <span className="text-slate-600">&bull;</span>
              <div>
                <strong className="text-white font-bold block text-sm">$0 / mo</strong>
                <span>GitHub Static Host</span>
              </div>
              <span className="text-slate-600">&bull;</span>
              <div>
                <strong className="text-white font-bold block text-sm">Owner Suite</strong>
                <span>Live Intelligence</span>
              </div>
            </div>
          </div>

          {/* Right Column: Hero Visual Showcase */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-2xl overflow-hidden border border-white/12 shadow-2xl bg-[#0e131d] group">
              <img
                src={heroCinemaImg}
                alt="Cinematic synchronized watch lounge"
                referrerPolicy="no-referrer"
                className="w-full aspect-[16/10] object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent flex flex-col justify-end p-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                    <span>LIVE ROOM: CINE-PARTY</span>
                  </div>
                  <span className="text-xs font-mono text-slate-300">09:56 / 14:48</span>
                </div>
                <h3 className="font-display font-bold text-lg text-white">
                  Ambient Ambilight &bull; Shared Playhead
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  When the host pauses or seeks, everyone's player adjusts simultaneously.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: FEATURED CINEMA PRESETS */}
      <section id="presets-section" className="px-4 md:px-8 max-w-7xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/8 pb-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase tracking-wider mb-1">
              Curated Open Cinema
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-white">
              Ready to Stream Instantly
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-md">
            Click any movie to spin up an instant synchronized room, or paste your own custom direct MP4 or GitHub raw link.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {VIDEO_PRESETS.map((preset) => (
            <div
              key={preset.id}
              className="bg-[#0b0f17] border border-white/8 hover:border-cyan-500/40 rounded-2xl overflow-hidden group transition-all flex flex-col"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-black">
                <img
                  src={preset.thumbnail}
                  alt={preset.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-mono text-cyan-300 border border-white/10">
                  {preset.duration}
                </div>
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    onClick={() => onQuickLaunchPreset(preset)}
                    className="p-3 bg-cyan-400 text-slate-950 rounded-full font-bold shadow-lg shadow-cyan-400/30 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Play className="w-5 h-5 fill-current pl-0.5" />
                  </button>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                    <span>{preset.genre}</span>
                    <span>&bull;</span>
                    <span className="text-cyan-400 font-mono text-[11px]">{preset.resolution}</span>
                  </div>
                  <h3 className="font-display font-bold text-base text-white group-hover:text-cyan-400 transition-colors">
                    {preset.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/8 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-mono">{preset.creator}</span>
                  <button
                    onClick={() => onQuickLaunchPreset(preset)}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Launch Room</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: GITHUB HOSTING & STREAMING SPOTLIGHT */}
      <section id="sync-engine-section" className="px-4 md:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-b from-[#0e1422] to-[#080b12] border border-white/10 p-6 md:p-12 overflow-hidden relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                <Github className="w-4 h-4" />
                <span>GITHUB PAGES ECOSYSTEM</span>
              </div>

              <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight">
                Built for GitHub Pages.<br />
                <span className="text-cyan-400">100% Static. Zero Server Cost.</span>
              </h2>

              <p className="text-sm md:text-base text-slate-300 leading-relaxed">
                Most watch party applications require expensive WebSocket relay servers. CineSync is engineered with peer cross-tab channels and standalone HTML bundles, allowing you to deploy to <code className="text-cyan-300 font-mono">username.github.io/repo/</code> in under a minute with zero server bills.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-xl bg-white/5 border border-white/8 space-y-1">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Check className="w-4 h-4 text-cyan-400" />
                    <span>Automated CI/CD Workflow</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Includes ready-to-commit <code className="text-slate-300">.github/workflows/deploy.yml</code> for continuous deployment.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-white/5 border border-white/8 space-y-1">
                  <div className="flex items-center gap-2 text-white font-bold text-xs">
                    <Check className="w-4 h-4 text-cyan-400" />
                    <span>Stream from GitHub Raw</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Host your video files directly inside GitHub Releases or repos and stream smoothly.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  onClick={onOpenGitHubHub}
                  className="py-2.5 px-5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-400/20"
                >
                  <Github className="w-4 h-4" />
                  <span>Open GitHub Hosting Hub</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <img
                  src={githubTechImg}
                  alt="GitHub hosting architecture"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
