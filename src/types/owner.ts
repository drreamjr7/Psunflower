export interface VisitorRecord {
  id: string;
  name: string;
  color: string;
  role: 'owner' | 'host' | 'guest' | 'bot';
  roomCode: string;
  roomName: string;
  firstSeenAt: number;
  lastActiveAt: number;
  browser: string;
  os: string;
  screenResolution: string;
  deviceType: 'Desktop' | 'Mobile' | 'Tablet';
  locationEstimate: string;
  isOnline: boolean;
  actionsCount: {
    messagesSent: number;
    reactionsTriggered: number;
    videoPlays: number;
    videoPauses: number;
    videoSeeks: number;
  };
  recentLogs: string[];
}

export interface OwnerEventLog {
  id: string;
  timestamp: number;
  type: string;
  senderName: string;
  senderId: string;
  roomCode: string;
  summary: string;
  details?: Record<string, unknown>;
}
