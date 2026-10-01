import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';

// Explicit Firebase configuration to ensure 100% production availability on GitHub Pages
export const FIREBASE_CONFIG = {
  projectId: "gen-lang-client-0356296806",
  appId: "1:814024512208:web:dd50e46214a0e75e3dc4d5",
  apiKey: "AIzaSyDq9ltqw3PCN8ZXTOz1NC2ZKs4Edzec1c8",
  authDomain: "gen-lang-client-0356296806.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-sunflowerwatchpa-1bb30064-91f8-487f-8d8d-7c8b5ae8ecbb",
  storageBucket: "gen-lang-client-0356296806.firebasestorage.app",
  messagingSenderId: "814024512208",
  measurementId: "",
  oAuthClientId: "814024512208-2i0cvrnbrfju7dou7ptd0b1rdshuepll.apps.googleusercontent.com",
  recaptchaSiteKey: ""
};

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(FIREBASE_CONFIG) : getApp();

// Initialize Firestore targeting the provisioned database ID
export const db = getFirestore(app, FIREBASE_CONFIG.firestoreDatabaseId);

export interface FirebaseRoom {
  roomId: string;
  roomName: string;
  hostId: string;
  hostName: string;
  videoUrl: string;
  videoTitle: string;
  isPlaying: boolean;
  playbackTime: number;
  playbackRate: number;
  lastUpdated: number;
  lastUpdatedBy?: string;
  updateSeq?: number;
  createdAt: number;
  announcement?: string | null;
}

export interface FirebaseParticipant {
  id: string;
  name: string;
  color: string;
  isHost: boolean;
  joinedAt: number;
  lastPing: number;
  avatarSeed?: string;
}

export interface FirebaseChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderColor: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
  reactionEmoji?: string;
}

/**
 * Fetch a room by its exact ID from Firebase
 */
export async function getRoomFromFirebase(roomId: string): Promise<FirebaseRoom | null> {
  const cleanId = roomId.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
  const docPath = `rooms/${cleanId}`;
  console.log('[Sunflower Room Sync] room ID being queried:', cleanId);
  console.log('[Sunflower Room Sync] Firestore document path:', docPath);

  try {
    const snap = await getDoc(doc(db, 'rooms', cleanId));
    if (snap.exists()) {
      const data = snap.data() as FirebaseRoom;
      console.log('[Sunflower Room Sync] successful room lookup:', data);
      return data;
    }
    console.log('[Sunflower Room Sync] room lookup failed - document does not exist:', docPath);
    return null;
  } catch (err) {
    console.error('[Sunflower Room Sync] Firestore error during getRoomFromFirebase:', err);
    return null;
  }
}

/**
 * Create a new room in Firebase
 */
export async function createRoomInFirebase(room: FirebaseRoom): Promise<void> {
  const cleanId = room.roomId.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
  const docPath = `rooms/${cleanId}`;
  console.log('[Sunflower Room Sync] Writing room to Firestore:', docPath, room);

  const roomData: FirebaseRoom = {
    ...room,
    roomId: cleanId,
    lastUpdated: Date.now(),
    updateSeq: 1,
  };
  await setDoc(doc(db, 'rooms', cleanId), roomData);
  console.log('[Sunflower Room Sync] Room successfully created in Firestore:', docPath);
}

/**
 * Realtime subscription to room state
 */
export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: FirebaseRoom | null) => void,
  onError?: (err: Error) => void
): () => void {
  const cleanId = roomId.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
  const roomRef = doc(db, 'rooms', cleanId);
  console.log('[Sunflower Room Sync] Subscribing onSnapshot to Firestore document:', `rooms/${cleanId}`);

  return onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data() as FirebaseRoom;
        onUpdate(data);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('[Sunflower Room Sync] Room snapshot listener error:', err);
      if (onError) onError(err);
    }
  );
}

/**
 * Update room playback state
 */
export async function updateRoomPlaybackInFirebase(
  roomId: string,
  updates: Partial<FirebaseRoom>
): Promise<void> {
  const cleanId = roomId.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
  const roomRef = doc(db, 'rooms', cleanId);

  try {
    await updateDoc(roomRef, {
      ...updates,
      lastUpdated: Date.now(),
    });
  } catch (err) {
    console.error('[Sunflower Room Sync] Error updating room playback:', err);
  }
}

/**
 * Register participant presence in room
 */
export async function joinRoomParticipant(
  roomId: string,
  participant: FirebaseParticipant
): Promise<void> {
  const cleanId = roomId.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
  const participantRef = doc(db, 'rooms', cleanId, 'participants', participant.id);
  console.log('[Sunflower Room Sync] Registering participant in Firestore:', `rooms/${cleanId}/participants/${participant.id}`);

  await setDoc(participantRef, {
    ...participant,
    lastPing: Date.now(),
  });
}

/**
 * Update participant heartbeat
 */
export async function updateParticipantPing(
  roomId: string,
  participantId: string
): Promise<void> {
  try {
    const cleanId = roomId.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
    const participantRef = doc(db, 'rooms', cleanId, 'participants', participantId);
    await updateDoc(participantRef, {
      lastPing: Date.now(),
    });
  } catch {
    // Ignore ping errors
  }
}

/**
 * Remove participant from room
 */
export async function leaveRoomParticipant(
  roomId: string,
  participantId: string
): Promise<void> {
  try {
    const cleanId = roomId.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
    const participantRef = doc(db, 'rooms', cleanId, 'participants', participantId);
    await deleteDoc(participantRef);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Subscribe to participant roster in real-time
 * NOTE: Does NOT filter by local client Date.now() to avoid cross-device clock skew bugs!
 */
export function subscribeToParticipants(
  roomId: string,
  onUpdate: (participants: FirebaseParticipant[]) => void
): () => void {
  const cleanId = roomId.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
  const participantsCol = collection(db, 'rooms', cleanId, 'participants');
  console.log('[Sunflower Room Sync] Subscribing to participants roster:', `rooms/${cleanId}/participants`);

  return onSnapshot(
    participantsCol,
    (snap) => {
      // Include all registered participants in room
      const list = snap.docs.map((d) => d.data() as FirebaseParticipant);
      onUpdate(list);
    },
    (err) => {
      console.error('[Sunflower Room Sync] Participants snapshot error:', err);
    }
  );
}

/**
 * Post chat message
 */
export async function sendChatMessageToFirebase(
  roomId: string,
  message: FirebaseChatMessage
): Promise<void> {
  const cleanId = roomId.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
  const msgRef = doc(db, 'rooms', cleanId, 'messages', message.id);
  await setDoc(msgRef, message);
}

/**
 * Subscribe to live chat messages
 */
export function subscribeToMessages(
  roomId: string,
  onUpdate: (messages: FirebaseChatMessage[]) => void
): () => void {
  const cleanId = roomId.trim().replace(/[^a-zA-Z0-9-_]/g, '').toUpperCase();
  const messagesQuery = query(
    collection(db, 'rooms', cleanId, 'messages'),
    orderBy('timestamp', 'asc')
  );

  return onSnapshot(
    messagesQuery,
    (snap) => {
      const msgs = snap.docs.map((d) => d.data() as FirebaseChatMessage);
      onUpdate(msgs);
    },
    (err) => {
      console.error('[Sunflower Room Sync] Messages snapshot error:', err);
    }
  );
}
