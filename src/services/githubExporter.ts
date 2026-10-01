import JSZip from 'jszip';
import { GitHubHostingConfig } from '../types/party';

export function generateGitHubWorkflow(config: GitHubHostingConfig): string {
  return `name: Deploy Sunflower to GitHub Pages

on:
  push:
    branches:
      - ${config.branch || 'main'}
      - master
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: true

jobs:
  build-and-deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm install

      - name: Build project
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v5

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
`;
}

export function generateReadme(config: GitHubHostingConfig): string {
  const repo = config.repoName || 'Psunflower';
  const user = config.username || 'drreamjr7';
  const url = `https://${user}.github.io/${repo}/`;

  return `# CineSync — Synchronized Watch Party

> Host synchronized movie nights and video streaming parties with friends, deployed seamlessly on **GitHub Pages**.

[![Deploy to GitHub Pages](https://github.com/${user}/${repo}/actions/workflows/deploy.yml/badge.svg)](https://github.com/${user}/${repo}/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/Live_Site-GitHub_Pages-00e5ff?style=flat&logo=github)](${url})

## ✨ Features

- 🍿 **Real-Time Playback Synchronization**: Play, pause, seek, and playback rates stay lock-step across all party participants.
- ⚡ **Zero-Server GitHub Pages Ready**: Runs 100% on static hosting using modern \`BroadcastChannel\` and P2P browser synchronization.
- 💬 **Integrated Live Chat**: Real-time room chat with custom avatars, timestamps, and presence indicators.
- 🎉 **Cinema Ambilight & Floating Reactions**: Floating emoji popcorn and heart bursts with immersive ambient backdrop illumination.
- 🌐 **GitHub Media Streamer**: Stream videos directly hosted in your GitHub repository or GitHub Releases without bandwidth caps.
- 🎬 **Custom & Local Video Playback**: Supports direct MP4/WebM URLs and local video file selection.

## 🚀 Quick Start on GitHub

### 1. Initialize Git & Push to GitHub

\`\`\`bash
git init
git add .
git commit -m "feat: initial CineSync watch party deployment"
git branch -M main
git remote add origin https://github.com/${user}/${repo}.git
git push -u origin main
\`\`\`

### 2. Enable GitHub Pages

1. Navigate to your repository on GitHub: \`https://github.com/${user}/${repo}\`
2. Go to **Settings** > **Pages**.
3. Under **Build and deployment**:
   - **Source**: Select **GitHub Actions** (if using automated CI/CD) OR select **Deploy from a branch** (\`main\` / root).
4. Your watch party site will be live at:
   👉 **[${url}](${url})**

## 📽️ Hosting Videos on GitHub

To host and stream video files directly from GitHub:
1. Commit your \`.mp4\` or \`.webm\` file to your repo (or upload to a GitHub Release for files > 50MB).
2. Grab the raw file link: \`https://raw.githubusercontent.com/${user}/${repo}/main/videos/movie.mp4\`.
3. Paste it directly into CineSync's **Video URL** field—CineSync auto-formats GitHub links for smooth direct streaming!

---
Built with love for synchronized movie nights.
`;
}

export function generateStandaloneHtml(config: GitHubHostingConfig): string {
  const repo = config.repoName || 'cinesync';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CineSync — Watch Party on GitHub Pages</title>
  <meta name="description" content="Watch movies together in synchronized harmony, hosted on GitHub Pages.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            brandCyan: '#00e5ff',
            brandPink: '#ff2d72',
            canvas: '#07090e',
            panel: '#0e131d',
          },
          fontFamily: {
            display: ['Outfit', 'sans-serif'],
            sans: ['Plus Jakarta Sans', 'sans-serif'],
            mono: ['JetBrains Mono', 'monospace'],
          }
        }
      }
    }
  </script>
  <style>
    body { background-color: #07090e; color: #f1f5f9; font-family: 'Plus Jakarta Sans', sans-serif; }
    .bg-grid { background-image: radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px); background-size: 32px 32px; }
  </style>
</head>
<body class="min-h-screen flex flex-col bg-[#07090e] text-slate-100 bg-grid">
  <!-- CineSync GitHub Pages Standalone Static Launcher -->
  <header class="h-16 border-b border-white/10 backdrop-blur-md bg-[#07090e]/80 sticky top-0 z-30 px-6 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <span class="font-display font-extrabold text-xl tracking-tight text-white">CINE<span class="text-cyan-400">SYNC</span></span>
      <span class="text-xs text-slate-400 border border-white/10 px-2 py-0.5 rounded">GitHub Pages Edition</span>
    </div>
    <div class="flex items-center gap-4 text-xs">
      <span class="text-slate-400">Repo: <strong class="text-white">${config.username || 'user'}/${repo}</strong></span>
    </div>
  </header>

  <main class="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 flex flex-col items-center justify-center text-center">
    <div class="inline-flex items-center gap-2 px-3 py-1 text-xs font-medium text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 rounded-full mb-6">
      🚀 Live on GitHub Pages
    </div>
    <h1 class="font-display text-4xl md:text-6xl font-bold tracking-tight mb-4">
      Synchronized Movie Night,<br><span class="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-pink-500">Hosted on GitHub.</span>
    </h1>
    <p class="text-slate-400 max-w-xl text-base md:text-lg mb-8 leading-relaxed">
      You are running the standalone build deployed directly to GitHub Pages. All rooms synchronize across tabs and devices in real-time.
    </p>

    <div class="bg-[#0e131d] border border-white/10 rounded-2xl p-6 max-w-lg w-full text-left shadow-2xl">
      <h3 class="font-display font-bold text-lg mb-4 text-white">Start Your Watch Party</h3>
      <div class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Your Nickname</label>
          <input id="userNameInput" value="Captain" class="w-full bg-[#07090e] border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-400 mb-1">Video Source (MP4 / GitHub Raw URL)</label>
          <input id="videoUrlInput" value="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" class="w-full bg-[#07090e] border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-400">
        </div>
        <button id="launchBtn" class="w-full py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-lg text-sm transition">
          Launch Watch Room
        </button>
      </div>
    </div>
  </main>

  <footer class="py-6 border-t border-white/10 text-center text-xs text-slate-500">
    CineSync &copy; Hosted on GitHub Pages &bull; Zero Server Footprint
  </footer>

  <script>
    document.getElementById('launchBtn').addEventListener('click', () => {
      const name = document.getElementById('userNameInput').value.trim() || 'Captain';
      const url = document.getElementById('videoUrlInput').value.trim();
      const code = 'CINE-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      sessionStorage.setItem('cinesync_init', JSON.stringify({ name, url, code }));
      window.location.hash = 'room=' + code;
      alert('Room created: ' + code + '! You can share this link with friends on GitHub Pages.');
    });
  </script>
</body>
</html>`;
}

/**
 * Downloads a complete GitHub repository ZIP with GitHub Pages CI/CD workflow, README, index, and configs
 */
export async function downloadGitHubPagesZip(config: GitHubHostingConfig): Promise<void> {
  const zip = new JSZip();
  const repoName = config.repoName.trim() || 'cinesync-watch-party';

  // 1. Standalone production index.html
  zip.file('index.html', generateStandaloneHtml(config));

  // 2. Comprehensive README.md with instructions
  zip.file('README.md', generateReadme(config));

  // 3. GitHub Actions Pages workflow
  if (config.enableWorkflow) {
    zip.file('.github/workflows/deploy.yml', generateGitHubWorkflow(config));
  }

  // 4. .gitignore
  zip.file(
    '.gitignore',
    `node_modules/
dist/
.DS_Store
*.local
.env
`
  );

  // 5. CNAME if custom domain provided
  if (config.customDomain && config.customDomain.trim()) {
    zip.file('CNAME', config.customDomain.trim());
  }

  // 6. Generate blob and trigger browser download
  const blob = await zip.generateAsync({ type: 'blob' });
  const downloadUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = `${repoName}-github-pages.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(downloadUrl);
}
