import { SyncPayload, Participant } from '../types/party';

export class CineSyncEngine {
  private roomId: string;
  private userId: string;
  private channel: BroadcastChannel | null = null;
  private listeners: ((payload: SyncPayload) => void)[] = [];
  private storageHandler: ((e: StorageEvent) => void) | null = null;
  private pingInterval: number | null = null;

  constructor(roomId: string, userId: string) {
    this.roomId = roomId;
    this.userId = userId;
    this.init();
  }

  private init() {
    const channelName = `cinesync_party_${this.roomId}`;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(channelName);
        this.channel.onmessage = (event) => {
          if (event.data && event.data.roomId === this.roomId) {
            this.notifyListeners(event.data);
          }
        };
      } catch (err) {
        console.warn('BroadcastChannel error, falling back to storage sync', err);
      }
    }

    // Storage event fallback for cross-tab sync
    this.storageHandler = (e: StorageEvent) => {
      if (e.key === `cinesync_sync_${this.roomId}` && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue) as SyncPayload;
          if (payload.senderId !== this.userId) {
            this.notifyListeners(payload);
          }
        } catch {
          // Ignore parse errors
        }
      }
    };
    window.addEventListener('storage', this.storageHandler);
  }

  public subscribe(cb: (payload: SyncPayload) => void) {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  private notifyListeners(payload: SyncPayload) {
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('Error in CineSync listener', err);
      }
    });
  }

  public broadcast(payload: Omit<SyncPayload, 'roomId' | 'timestamp'>) {
    const fullPayload: SyncPayload = {
      ...payload,
      roomId: this.roomId,
      timestamp: Date.now(),
    };

    // 1. Post to local listeners
    this.notifyListeners(fullPayload);

    // 2. Post to BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage(fullPayload);
      } catch {
        // Channel post fallback
      }
    }

    // 3. Post to localStorage for tab/window propagation
    try {
      localStorage.setItem(`cinesync_sync_${this.roomId}`, JSON.stringify(fullPayload));
    } catch {
      // Storage quota or restriction fallback
    }
  }

  public startHeartbeat(participant: Participant) {
    if (this.pingInterval) clearInterval(this.pingInterval);
    this.pingInterval = window.setInterval(() => {
      this.broadcast({
        type: 'PING',
        senderId: participant.id,
        senderName: participant.name,
      });
    }, 4000);
  }

  public destroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.channel) {
      try {
        this.channel.close();
      } catch {
        // Ignore
      }
      this.channel = null;
    }
    if (this.storageHandler) {
      window.removeEventListener('storage', this.storageHandler);
      this.storageHandler = null;
    }
    this.listeners = [];
  }
}

/**
 * Normalizes video URLs, converting GitHub repo and blob links to direct raw streaming URLs
 */
export function normalizeVideoUrl(inputUrl: string): string {
  if (!inputUrl) return '';
  const trimmed = inputUrl.trim();

  // Convert GitHub blob links e.g.
  // https://github.com/user/repo/blob/main/folder/movie.mp4 -> https://raw.githubusercontent.com/user/repo/main/folder/movie.mp4
  const githubBlobRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i;
  const match = trimmed.match(githubBlobRegex);
  if (match) {
    const [, user, repo, branch, path] = match;
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
  }

  // Convert github.com/user/repo/raw/... to raw.githubusercontent.com/...
  const githubRawRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/raw\/([^/]+)\/(.+)$/i;
  const rawMatch = trimmed.match(githubRawRegex);
  if (rawMatch) {
    const [, user, repo, branch, path] = rawMatch;
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
  }

  return trimmed;
}

export function generateRoomCode(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let res = 'CINE-';
  for (let i = 0; i < 5; i++) {
    res += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return res;
}

export const USER_COLORS = [
  '#00e5ff', // Cyan
  '#ff2d72', // Magenta/Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Sky
  '#f97316', // Orange
];

export function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}
