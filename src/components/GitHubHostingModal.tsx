import React, { useState } from 'react';
import {
  Github,
  Download,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  Globe,
  Film,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  Play
} from 'lucide-react';
import { GitHubHostingConfig } from '../types/party';
import {
  downloadGitHubPagesZip,
  generateGitHubWorkflow,
  generateReadme,
  generateStandaloneHtml
} from '../services/githubExporter';
import { normalizeVideoUrl } from '../services/syncEngine';
import githubBanner from '../assets/images/github_hosting_concept_1790750957667.jpg';

interface GitHubHostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVideoUrl?: (url: string, title?: string) => void;
}

export const GitHubHostingModal: React.FC<GitHubHostingModalProps> = ({
  isOpen,
  onClose,
  onSelectVideoUrl,
}) => {
  const [activeTab, setActiveTab] = useState<'quick-zip' | 'workflow' | 'streamer' | 'docs'>('quick-zip');
  const [config, setConfig] = useState<GitHubHostingConfig>({
    repoName: 'cinesync-party',
    username: 'octocat',
    branch: 'main',
    customDomain: '',
    enableWorkflow: true,
  });

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // GitHub Streamer state
  const [rawInputUrl, setRawInputUrl] = useState(
    'https://github.com/octocat/Spoon-Knife/blob/main/sample-trailer.mp4'
  );
  const [previewStreamUrl, setPreviewStreamUrl] = useState('');
  const [streamError, setStreamError] = useState('');

  if (!isOpen) return null;

  const livePagesUrl = `https://${config.username || 'username'}.github.io/${config.repoName || 'cinesync-party'}/`;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      await downloadGitHubPagesZip(config);
    } catch (err) {
      console.error('Failed to create zip', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleNormalizeAndTest = () => {
    const direct = normalizeVideoUrl(rawInputUrl);
    setPreviewStreamUrl(direct);
    setStreamError('');
  };

  const gitCommands = `git init
git add .
git commit -m "feat: deploy CineSync watch party to GitHub Pages"
git branch -M ${config.branch || 'main'}
git remote add origin https://github.com/${config.username || 'username'}/${config.repoName || 'cinesync-party'}.git
git push -u origin ${config.branch || 'main'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b0f17] border border-white/10 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/8 flex items-center justify-between bg-[#0e131d]/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white">
              <Github className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg text-white flex items-center gap-2">
                <span>GitHub Hosting Hub</span>
                <span className="text-[11px] font-mono font-normal text-cyan-400 border border-cyan-400/30 bg-cyan-950/40 px-2 py-0.5 rounded">
                  GitHub Pages Ready
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Deploy your own zero-cost synchronized watch party site directly onto GitHub Pages.
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

        {/* Tab navigation */}
        <div className="px-6 pt-3 border-b border-white/8 flex items-center gap-2 overflow-x-auto bg-[#090d14]">
          <button
            onClick={() => setActiveTab('quick-zip')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'quick-zip'
                ? 'text-cyan-400 border-cyan-400 bg-white/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>1-Click Package (.ZIP)</span>
          </button>
          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'workflow'
                ? 'text-cyan-400 border-cyan-400 bg-white/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>GitHub Actions CI/CD</span>
          </button>
          <button
            onClick={() => setActiveTab('streamer')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'streamer'
                ? 'text-cyan-400 border-cyan-400 bg-white/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Stream Videos from GitHub</span>
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer flex items-center gap-1.5 border-b-2 whitespace-nowrap ${
              activeTab === 'docs'
                ? 'text-cyan-400 border-cyan-400 bg-white/5'
                : 'text-slate-400 border-transparent hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Pages Walkthrough</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: 1-Click Package ZIP */}
          {activeTab === 'quick-zip' && (
            <div className="space-y-6">
              {/* Banner */}
              <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-[21/9] max-h-48">
                <img
                  src={githubBanner}
                  alt="GitHub Hosting architecture"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-[#0b0f17]/60 to-transparent flex flex-col justify-end p-5">
                  <span className="text-xs font-mono text-cyan-400">Zero Server Cost · Static Architecture</span>
                  <h3 className="font-display font-bold text-xl text-white">Instant GitHub Pages Deployment Bundle</h3>
                  <p className="text-xs text-slate-300 max-w-xl">
                    Downloads an entire pre-packaged repository containing static assets, GitHub Actions workflow, README, and CNAME.
                  </p>
                </div>
              </div>

              {/* Form config */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0e131d] border border-white/8 p-4 rounded-xl">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    GitHub Username or Organization
                  </label>
                  <input
                    type="text"
                    value={config.username}
                    onChange={(e) => setConfig({ ...config, username: e.target.value })}
                    placeholder="e.g. octocat"
                    className="w-full bg-[#07090e] border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Repository Name
                  </label>
                  <input
                    type="text"
                    value={config.repoName}
                    onChange={(e) => setConfig({ ...config, repoName: e.target.value })}
                    placeholder="e.g. cinesync-party"
                    className="w-full bg-[#07090e] border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Target Branch
                  </label>
                  <select
                    value={config.branch}
                    onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                    className="w-full bg-[#07090e] border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="main">main (recommended)</option>
                    <option value="gh-pages">gh-pages</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Custom Domain (optional)
                  </label>
                  <input
                    type="text"
                    value={config.customDomain}
                    onChange={(e) => setConfig({ ...config, customDomain: e.target.value })}
                    placeholder="e.g. movie.myfamily.com"
                    className="w-full bg-[#07090e] border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
                  />
                </div>
              </div>

              {/* Live URL Preview box */}
              <div className="bg-cyan-950/20 border border-cyan-500/25 p-4 rounded-xl flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <span className="text-[11px] font-mono text-cyan-400 block">Your Upcoming GitHub Pages URL:</span>
                    <a
                      href={livePagesUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold text-white hover:underline flex items-center gap-1.5"
                    >
                      <span>{livePagesUrl}</span>
                      <ExternalLink className="w-3 h-3 text-cyan-400" />
                    </a>
                  </div>
                </div>
                <button
                  onClick={() => copyToClipboard(livePagesUrl, 'live-url')}
                  className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg text-slate-200 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  {copiedKey === 'live-url' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'live-url' ? 'Copied' : 'Copy URL'}</span>
                </button>
              </div>

              {/* Action */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  onClick={handleDownloadZip}
                  disabled={isDownloading}
                  className="w-full sm:w-auto flex-1 py-3 px-6 bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-300 hover:to-cyan-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{isDownloading ? 'Packaging Repository...' : `Download ${config.repoName}.zip`}</span>
                </button>
                <button
                  onClick={() => copyToClipboard(gitCommands, 'git-commands')}
                  className="w-full sm:w-auto py-3 px-5 bg-white/5 hover:bg-white/10 border border-white/15 text-white font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedKey === 'git-commands' ? <Check className="w-4 h-4 text-emerald-400" /> : <Terminal className="w-4 h-4 text-cyan-400" />}
                  <span>Copy Git Push Terminal Commands</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: GitHub Actions Workflow */}
          {activeTab === 'workflow' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display font-bold text-sm text-white">
                    Automatic CI/CD: .github/workflows/deploy.yml
                  </h3>
                  <p className="text-xs text-slate-400">
                    Commit this file to your repo. Every push to <code className="text-cyan-400">{config.branch}</code> will automatically build and publish to GitHub Pages.
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(generateGitHubWorkflow(config), 'workflow-code')}
                  className="px-3 py-1.5 text-xs bg-cyan-400/10 hover:bg-cyan-400/20 border border-cyan-400/30 text-cyan-300 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedKey === 'workflow-code' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'workflow-code' ? 'Copied Workflow' : 'Copy Workflow YAML'}</span>
                </button>
              </div>

              <pre className="p-4 bg-[#05070a] border border-white/10 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-80">
                {generateGitHubWorkflow(config)}
              </pre>
            </div>
          )}

          {/* TAB 3: Stream Videos from GitHub */}
          {activeTab === 'streamer' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
                  <span>GitHub Direct Video Streamer</span>
                  <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded">
                    raw.githubusercontent.com
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Did you know GitHub repositories and Releases can host MP4/WebM video files? Paste any GitHub link here and CineSync will convert it into a smooth, streamable media feed.
                </p>
              </div>

              <div className="space-y-3 bg-[#0e131d] border border-white/8 p-4 rounded-xl">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Paste any GitHub Video Link or Release Asset
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rawInputUrl}
                      onChange={(e) => setRawInputUrl(e.target.value)}
                      placeholder="https://github.com/user/repo/blob/main/movies/trailer.mp4"
                      className="flex-1 bg-[#07090e] border border-white/15 focus:border-cyan-400 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                    <button
                      onClick={handleNormalizeAndTest}
                      className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Convert &amp; Test
                    </button>
                  </div>
                </div>

                {previewStreamUrl && (
                  <div className="space-y-2 pt-2 border-t border-white/8">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-mono">Streamable URL:</span>
                      <button
                        onClick={() => copyToClipboard(previewStreamUrl, 'stream-url')}
                        className="text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        {copiedKey === 'stream-url' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>Copy Direct Stream</span>
                      </button>
                    </div>
                    <input
                      readOnly
                      value={previewStreamUrl}
                      className="w-full bg-[#05070a] border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-cyan-300"
                    />

                    {/* Preview video */}
                    <div className="relative aspect-video rounded-lg overflow-hidden bg-black max-w-md mx-auto border border-white/10 mt-3">
                      <video
                        src={previewStreamUrl}
                        controls
                        className="w-full h-full object-contain"
                        onError={() => setStreamError('Unable to load video. Ensure the GitHub repo is public and the video format is MP4/WebM.')}
                      />
                    </div>

                    {streamError && (
                      <p className="text-xs text-rose-400 bg-rose-950/30 border border-rose-500/20 p-2 rounded">
                        {streamError}
                      </p>
                    )}

                    {onSelectVideoUrl && (
                      <button
                        onClick={() => {
                          onSelectVideoUrl(previewStreamUrl, 'GitHub Streamed Video');
                          onClose();
                        }}
                        className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                        <span>Use This GitHub Video in Party Room</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: Pages Walkthrough */}
          {activeTab === 'docs' && (
            <div className="space-y-4">
              <h3 className="font-display font-bold text-sm text-white">
                How to Enable GitHub Pages in 3 Simple Steps
              </h3>

              <div className="space-y-3">
                <div className="bg-[#0e131d] border border-white/8 p-4 rounded-xl flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 font-mono text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Create a New GitHub Repository</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Go to <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">github.com/new</a> and create a public repository named <code className="text-slate-200">{config.repoName}</code>.
                    </p>
                  </div>
                </div>

                <div className="bg-[#0e131d] border border-white/8 p-4 rounded-xl flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 font-mono text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Unzip &amp; Push the Code</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Extract the downloaded ZIP into a folder, open your terminal in that folder, and run:
                    </p>
                    <pre className="mt-2 p-2.5 bg-[#05070a] border border-white/10 rounded-lg text-[11px] font-mono text-slate-300">
                      {gitCommands}
                    </pre>
                  </div>
                </div>

                <div className="bg-[#0e131d] border border-white/8 p-4 rounded-xl flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 font-mono text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Turn on GitHub Pages in Repository Settings</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Navigate to your repo on GitHub &rarr; <strong>Settings</strong> &rarr; <strong>Pages</strong>. Under <strong>Build and deployment</strong>, set Source to <strong>GitHub Actions</strong> (or branch <code className="text-slate-200">main</code>). In ~45 seconds, your site is live!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/8 bg-[#090d14] flex items-center justify-between text-xs text-slate-400">
          <span>Static P2P Sync &bull; No Server Maintenance Required</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
