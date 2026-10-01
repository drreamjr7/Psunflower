import { VisitorRecord, OwnerEventLog } from '../types/owner';

const STORAGE_KEY_VISITORS = 'sunflower_owner_visitors';
const STORAGE_KEY_EVENTS = 'sunflower_owner_events';

function detectBrowserAndOS() {
  if (typeof window === 'undefined') {
    return { browser: 'Unknown', os: 'Unknown', deviceType: 'Desktop' as const };
  }

  const ua = navigator.userAgent;
  let browser = 'Chrome';
  if (ua.indexOf('Firefox') > -1) browser = 'Firefox';
  else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) browser = 'Safari';
  else if (ua.indexOf('Edg') > -1) browser = 'Edge';

  let os = 'Windows';
  if (ua.indexOf('Mac OS') > -1) os = 'macOS';
  else if (ua.indexOf('Linux') > -1) os = 'Linux';
  else if (ua.indexOf('Android') > -1) os = 'Android';
  else if (ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) os = 'iOS';

  let deviceType: 'Desktop' | 'Mobile' | 'Tablet' = 'Desktop';
  if (/Mobi|Android/i.test(ua)) deviceType = 'Mobile';
  if (/iPad|Tablet/i.test(ua)) deviceType = 'Tablet';

  return { browser, os, deviceType };
}

export function getVisitorHistory(): VisitorRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VISITORS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveVisitorRecord(record: VisitorRecord) {
  try {
    const current = getVisitorHistory();
    const index = current.findIndex((v) => v.id === record.id);
    if (index > -1) {
      current[index] = record;
    } else {
      current.unshift(record);
    }
    // keep max 50 records
    const trimmed = current.slice(0, 50);
    localStorage.setItem(STORAGE_KEY_VISITORS, JSON.stringify(trimmed));
  } catch {
    // ignore
  }
}

export function trackVisitorJoin(
  id: string,
  name: string,
  role: 'owner' | 'host' | 'guest' | 'bot',
  roomCode: string,
  roomName: string,
  color: string
): VisitorRecord {
  const { browser, os, deviceType } = detectBrowserAndOS();
  const screenResolution = `${window.screen.width}x${window.screen.height} (${window.innerWidth}x${window.innerHeight})`;

  // Approximate timezone
  let locationEstimate = 'Global / Localhost';
  try {
    locationEstimate = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    // fallback
  }

  const existing = getVisitorHistory().find((v) => v.id === id);
  const now = Date.now();

  const visitor: VisitorRecord = existing
    ? {
        ...existing,
        name,
        role,
        roomCode,
        roomName,
        lastActiveAt: now,
        isOnline: true,
        recentLogs: [
          `Joined room "${roomName}" (${roomCode}) at ${formatHHMM(now)}`,
          ...(existing.recentLogs || []),
        ].slice(0, 15),
      }
    : {
        id,
        name,
        color,
        role,
        roomCode,
        roomName,
        firstSeenAt: now,
        lastActiveAt: now,
        browser,
        os,
        screenResolution,
        deviceType,
        locationEstimate,
        isOnline: true,
        actionsCount: {
          messagesSent: 0,
          reactionsTriggered: 0,
          videoPlays: 0,
          videoPauses: 0,
          videoSeeks: 0,
        },
        recentLogs: [`Visited Sunflower and entered room ${roomCode} at ${formatHHMM(now)}`],
      };

  saveVisitorRecord(visitor);
  logOwnerEvent({
    type: 'VISITOR_JOIN',
    senderId: id,
    senderName: name,
    roomCode,
    summary: `${name} (${role}) connected via ${browser} on ${os}`,
  });

  return visitor;
}

export function trackVisitorAction(
  userId: string,
  action: 'message' | 'reaction' | 'play' | 'pause' | 'seek',
  logText: string
) {
  const current = getVisitorHistory();
  const visitor = current.find((v) => v.id === userId);
  if (!visitor) return;

  visitor.lastActiveAt = Date.now();
  visitor.isOnline = true;
  if (action === 'message') visitor.actionsCount.messagesSent += 1;
  else if (action === 'reaction') visitor.actionsCount.reactionsTriggered += 1;
  else if (action === 'play') visitor.actionsCount.videoPlays += 1;
  else if (action === 'pause') visitor.actionsCount.videoPauses += 1;
  else if (action === 'seek') visitor.actionsCount.videoSeeks += 1;

  visitor.recentLogs = [
    `[${formatHHMM(Date.now())}] ${logText}`,
    ...(visitor.recentLogs || []),
  ].slice(0, 15);

  saveVisitorRecord(visitor);
}

export function logOwnerEvent(event: Omit<OwnerEventLog, 'id' | 'timestamp'>) {
  try {
    const fullEvent: OwnerEventLog = {
      ...event,
      id: `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    const existing: OwnerEventLog[] = raw ? JSON.parse(raw) : [];
    existing.unshift(fullEvent);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(existing.slice(0, 100)));
  } catch {
    // ignore
  }
}

export function getOwnerEvents(): OwnerEventLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function clearAnalyticsData() {
  localStorage.removeItem(STORAGE_KEY_VISITORS);
  localStorage.removeItem(STORAGE_KEY_EVENTS);
}

export function formatHHMM(timestamp: number): string {
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function formatHHMMSS(timestamp: number): string {
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
