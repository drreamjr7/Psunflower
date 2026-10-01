export interface Participant {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  avatarSeed: string;
  joinedAt: number;
  lastPing: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface SyncPayload {
  type: 'SYNC_STATE' | 'PLAY' | 'PAUSE' | 'SEEK' | 'SPEED' | 'URL_CHANGE' | 'CHAT' | 'REACTION' | 'PING' | 'USER_JOIN' | 'USER_LEAVE';
  roomId: string;
  senderId: string;
  senderName: string;
  currentTime?: number;
  isPlaying?: boolean;
  playbackRate?: number;
  videoUrl?: string;
  videoTitle?: string;
  chatMessage?: ChatMessage;
  reactionEmoji?: string;
  timestamp: number;
}

export interface VideoPreset {
  id: string;
  title: string;
  creator: string;
  duration: string;
  resolution: string;
  genre: string;
  description: string;
  url: string;
  thumbnail: string;
  sourceType: 'sample' | 'github' | 'custom';
}

export interface ReactionBurst {
  id: string;
  emoji: string;
  senderName: string;
  x: number; // percentage 10-90
  y: number; // percentage
  size: number;
}

export interface GitHubHostingConfig {
  repoName: string;
  username: string;
  branch: string;
  customDomain: string;
  enableWorkflow: boolean;
}
