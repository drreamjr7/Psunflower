# Sunflower 🌻 — Synchronized Watch Party & Cinema Lounge

> Real-time synchronized cinema rooms with friends, live chat with formatted timestamps (HH:MM), owner intelligence console, and 100% free serverless deployment on **GitHub Pages**.

[![Deploy Sunflower to GitHub Pages](https://github.com/drreamjr7/Psunflower/actions/workflows/deploy.yml/badge.svg)](https://github.com/drreamjr7/Psunflower/actions/workflows/deploy.yml)
[![Live Site](https://img.shields.io/badge/Live_Site-GitHub_Pages-f59e0b?style=flat&logo=github)](https://drreamjr7.github.io/Psunflower/)

---

## 🌟 Live Demo

👉 **[https://drreamjr7.github.io/Psunflower/](https://drreamjr7.github.io/Psunflower/)**

---

## ✨ Features

- 🌻 **Sunflower Themed Cinema Experience**: Fluid golden title animations with playful swaying sunflower petals.
- 🍿 **Frame-Accurate Synchronization**: Play, pause, seek, and playback rate stay in sync across all connected participants via modern `BroadcastChannel` and P2P synchronization.
- 💬 **Live Chat with Formatted Timestamps**: Clean, high-contrast `HH:MM` timestamp badges on every message with sender role markers.
- 🛡️ **Sunflower Owner & Dev Console**:
  - Live visitor roster with device intelligence (OS, browser, screen resolution, timezone).
  - Test bot generator (*"Luna 🌻"*, *"Sam 🍿"*, *"Leo 🎬"*) for local multi-user testing.
  - Master playback overrides and global owner broadcast banners.
  - 1-click forensic JSON/CSV export.
- 🚀 **GitHub Pages Ready**:
  - Automated CI/CD workflow configured at `.github/workflows/deploy.yml`.
  - Vite base set to `/Psunflower/`.
  - Client-side routing fallback via `public/404.html`.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build for production
npm run build
```

---

## 🚀 GitHub Pages Deployment

Deployment is 100% automated via GitHub Actions:

1. Push this repository to **`drreamjr7/Psunflower`**.
2. Go to **Settings** &rarr; **Pages** in your repository.
3. Under **Build and deployment** &rarr; **Source**, select **GitHub Actions**.
4. GitHub Actions will automatically build and publish the site to **`https://drreamjr7.github.io/Psunflower/`**.
