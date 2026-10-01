import { SyncPayload, Participant } from '../types/party';
import {
  updateRoomPlaybackInFirebase,
  joinRoomParticipant,
  updateParticipantPing,
  leaveRoomParticipant,
  subscribeToRoom,
  subscribeToMessages,
  sendChatMessageToFirebase,
  FirebaseRoom,
  FirebaseChatMessage,
} from './firebase';

export class CineSyncEngine {
  private roomId: string;
  private userId: string;
  private channel: BroadcastChannel | null = null;
  private listeners: ((payload: SyncPayload) => void)[] = [];
  private storageHandler: ((e: StorageEvent) => void) | null = null;
  private pingInterval: number | null = null;
  private unsubs: (() => void)[] = [];

  constructor(roomId: string, userId: string) {
    this.roomId = roomId.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
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
        console.warn('BroadcastChannel fallback:', err);
      }
    }

    // Storage event fallback for same-device tabs
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

    // 1. Subscribe to Firebase Room updates
    try {
      const unsubRoom = subscribeToRoom(this.roomId, (room: FirebaseRoom | null) => {
        if (!room) return;
        // Ignore updates originated by THIS user to avoid playback loops
        if (room.lastUpdatedBy === this.userId) return;

        console.log('[Sunflower Room Sync] Received remote room update from Firestore:', {
          roomId: room.roomId,
          isPlaying: room.isPlaying,
          playbackTime: room.playbackTime,
          lastUpdatedBy: room.lastUpdatedBy,
        });

        // Broadcast playback state to listeners
        if (room.isPlaying) {
          this.notifyListeners({
            type: 'PLAY',
            roomId: this.roomId,
            senderId: room.lastUpdatedBy || room.hostId || 'host',
            senderName: room.hostName || 'Host',
            currentTime: room.playbackTime,
            timestamp: room.lastUpdated,
          });
        } else {
          this.notifyListeners({
            type: 'PAUSE',
            roomId: this.roomId,
            senderId: room.lastUpdatedBy || room.hostId || 'host',
            senderName: room.hostName || 'Host',
            currentTime: room.playbackTime,
            timestamp: room.lastUpdated,
          });
        }

        // If video changed
        if (room.videoUrl) {
          this.notifyListeners({
            type: 'URL_CHANGE',
            roomId: this.roomId,
            senderId: room.lastUpdatedBy || room.hostId || 'host',
            senderName: room.hostName || 'Host',
            videoUrl: room.videoUrl,
            videoTitle: room.videoTitle,
            timestamp: room.lastUpdated,
          });
        }
      });
      this.unsubs.push(unsubRoom);
    } catch (err) {
      console.error('[Sunflower Room Sync] Firebase room subscription error:', err);
    }

    // 2. Subscribe to Firebase Messages
    try {
      const unsubMessages = subscribeToMessages(this.roomId, (messages: FirebaseChatMessage[]) => {
        if (messages.length > 0) {
          const latest = messages[messages.length - 1];
          if (latest.senderId !== this.userId && Date.now() - latest.timestamp < 15000) {
            if (latest.reactionEmoji) {
              this.notifyListeners({
                type: 'REACTION',
                roomId: this.roomId,
                senderId: latest.senderId,
                senderName: latest.senderName,
                reactionEmoji: latest.reactionEmoji,
                timestamp: latest.timestamp,
              });
            } else {
              this.notifyListeners({
                type: 'CHAT',
                roomId: this.roomId,
                senderId: latest.senderId,
                senderName: latest.senderName,
                chatMessage: latest,
                timestamp: latest.timestamp,
              });
            }
          }
        }
      });
      this.unsubs.push(unsubMessages);
    } catch (err) {
      console.error('[Sunflower Room Sync] Firebase messages subscription error:', err);
    }
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
        console.error('[Sunflower Room Sync] Error in CineSync listener', err);
      }
    });
  }

  public broadcast(payload: Omit<SyncPayload, 'roomId' | 'timestamp'>) {
    const fullPayload: SyncPayload = {
      ...payload,
      roomId: this.roomId,
      timestamp: Date.now(),
    };

    // 1. Notify local listeners immediately
    this.notifyListeners(fullPayload);

    // 2. BroadcastChannel for same-device tabs
    if (this.channel) {
      try {
        this.channel.postMessage(fullPayload);
      } catch {
        // Fallback
      }
    }

    // 3. LocalStorage for tab sync
    try {
      localStorage.setItem(`cinesync_sync_${this.roomId}`, JSON.stringify(fullPayload));
    } catch {
      // Ignore
    }

    // 4. Push to Firebase Firestore for cross-device synchronization
    this.syncToFirebase(payload);
  }

  private syncToFirebase(payload: Omit<SyncPayload, 'roomId' | 'timestamp'>) {
    console.log('[Sunflower Room Sync] Broadcasting payload to Firestore:', payload.type);

    if (payload.type === 'PLAY') {
      updateRoomPlaybackInFirebase(this.roomId, {
        isPlaying: true,
        playbackTime: payload.currentTime !== undefined ? payload.currentTime : 0,
        lastUpdatedBy: this.userId,
      }).catch((err) => console.warn('[Sunflower Room Sync] Firebase play update error:', err));
    } else if (payload.type === 'PAUSE') {
      updateRoomPlaybackInFirebase(this.roomId, {
        isPlaying: false,
        playbackTime: payload.currentTime !== undefined ? payload.currentTime : 0,
        lastUpdatedBy: this.userId,
      }).catch((err) => console.warn('[Sunflower Room Sync] Firebase pause update error:', err));
    } else if (payload.type === 'SEEK') {
      updateRoomPlaybackInFirebase(this.roomId, {
        playbackTime: payload.currentTime !== undefined ? payload.currentTime : 0,
        lastUpdatedBy: this.userId,
      }).catch((err) => console.warn('[Sunflower Room Sync] Firebase seek update error:', err));
    } else if (payload.type === 'SPEED') {
      updateRoomPlaybackInFirebase(this.roomId, {
        playbackRate: payload.playbackRate || 1,
        lastUpdatedBy: this.userId,
      }).catch((err) => console.warn('[Sunflower Room Sync] Firebase speed update error:', err));
    } else if (payload.type === 'URL_CHANGE') {
      updateRoomPlaybackInFirebase(this.roomId, {
        videoUrl: payload.videoUrl,
        videoTitle: payload.videoTitle,
        playbackTime: 0,
        isPlaying: false,
        lastUpdatedBy: this.userId,
      }).catch((err) => console.warn('[Sunflower Room Sync] Firebase URL change error:', err));
    } else if (payload.type === 'CHAT' && payload.chatMessage) {
      sendChatMessageToFirebase(this.roomId, payload.chatMessage).catch((err) =>
        console.warn('[Sunflower Room Sync] Firebase chat error:', err)
      );
    } else if (payload.type === 'REACTION' && payload.reactionEmoji) {
      sendChatMessageToFirebase(this.roomId, {
        id: `react-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        senderId: payload.senderId,
        senderName: payload.senderName,
        senderColor: '#f59e0b',
        text: `Sent reaction ${payload.reactionEmoji}`,
        timestamp: Date.now(),
        reactionEmoji: payload.reactionEmoji,
      }).catch((err) => console.warn('[Sunflower Room Sync] Firebase reaction error:', err));
    }
  }

  public startHeartbeat(participant: Participant) {
    if (this.pingInterval) clearInterval(this.pingInterval);

    // Initial register in Firebase
    joinRoomParticipant(this.roomId, {
      id: participant.id,
      name: participant.name,
      color: participant.color,
      isHost: !!participant.isHost,
      joinedAt: participant.joinedAt || Date.now(),
      lastPing: Date.now(),
      avatarSeed: participant.avatarSeed || participant.name,
    }).catch((err) => console.warn('[Sunflower Room Sync] Join participant error:', err));

    // Send heartbeats every 8 seconds
    this.pingInterval = window.setInterval(() => {
      updateParticipantPing(this.roomId, participant.id).catch(() => {});
      this.broadcast({
        type: 'PING',
        senderId: participant.id,
        senderName: participant.name,
      });
    }, 8000);
  }

  public destroy() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    leaveRoomParticipant(this.roomId, this.userId).catch(() => {});

    this.unsubs.forEach((unsub) => {
      try {
        unsub();
      } catch {
        // Ignore
      }
    });
    this.unsubs = [];

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

  const githubBlobRegex = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i;
  const match = trimmed.match(githubBlobRegex);
  if (match) {
    const [, user, repo, branch, path] = match;
    return `https://raw.githubusercontent.com/${user}/${repo}/${branch}/${path}`;
  }

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
  let res = 'SUN-';
  for (let i = 0; i < 5; i++) {
    res += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return res;
}

export const USER_COLORS = [
  '#f59e0b', // Amber / Sunflower Gold
  '#00e5ff', // Cyan
  '#ff2d72', // Magenta/Pink
  '#10b981', // Emerald
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Sky
  '#f97316', // Orange
];

export function getRandomColor(): string {
  return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}
