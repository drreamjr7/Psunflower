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
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App singleton
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with specific database ID if configured
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Validate connection per skill instructions
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'rooms', '__ping_check__'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network disconnected.');
    }
  }
}
testFirestoreConnection();

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
  try {
    const cleanId = roomId.trim().toUpperCase();
    const snap = await getDoc(doc(db, 'rooms', cleanId));
    if (snap.exists()) {
      return snap.data() as FirebaseRoom;
    }
    return null;
  } catch (err) {
    console.error('Error fetching room from Firebase:', err);
    return null;
  }
}

/**
 * Create a new room in Firebase
 */
export async function createRoomInFirebase(room: FirebaseRoom): Promise<void> {
  const cleanId = room.roomId.trim().toUpperCase();
  const roomData = {
    ...room,
    roomId: cleanId,
    lastUpdated: Date.now(),
  };
  await setDoc(doc(db, 'rooms', cleanId), roomData);
}

/**
 * Realtime subscription to room state
 */
export function subscribeToRoom(
  roomId: string,
  onUpdate: (room: FirebaseRoom | null) => void,
  onError?: (err: Error) => void
): () => void {
  const cleanId = roomId.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', cleanId);

  return onSnapshot(
    roomRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as FirebaseRoom);
      } else {
        onUpdate(null);
      }
    },
    (err) => {
      console.error('Room snapshot error:', err);
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
  const cleanId = roomId.trim().toUpperCase();
  const roomRef = doc(db, 'rooms', cleanId);
  await updateDoc(roomRef, {
    ...updates,
    lastUpdated: Date.now(),
  });
}

/**
 * Register participant presence in room
 */
export async function joinRoomParticipant(
  roomId: string,
  participant: FirebaseParticipant
): Promise<void> {
  const cleanId = roomId.trim().toUpperCase();
  const participantRef = doc(db, 'rooms', cleanId, 'participants', participant.id);
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
    const cleanId = roomId.trim().toUpperCase();
    const participantRef = doc(db, 'rooms', cleanId, 'participants', participantId);
    await updateDoc(participantRef, {
      lastPing: Date.now(),
    });
  } catch {
    // Participant may have already left or disconnected
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
    const cleanId = roomId.trim().toUpperCase();
    const participantRef = doc(db, 'rooms', cleanId, 'participants', participantId);
    await deleteDoc(participantRef);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Subscribe to participant roster in real-time
 */
export function subscribeToParticipants(
  roomId: string,
  onUpdate: (participants: FirebaseParticipant[]) => void
): () => void {
  const cleanId = roomId.trim().toUpperCase();
  const participantsCol = collection(db, 'rooms', cleanId, 'participants');

  return onSnapshot(
    participantsCol,
    (snap) => {
      const now = Date.now();
      // Filter out stale participants who haven't pinged in 45 seconds
      const list = snap.docs
        .map((d) => d.data() as FirebaseParticipant)
        .filter((p) => !p.lastPing || now - p.lastPing < 45000);
      onUpdate(list);
    },
    (err) => {
      console.error('Participants snapshot error:', err);
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
  const cleanId = roomId.trim().toUpperCase();
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
  const cleanId = roomId.trim().toUpperCase();
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
      console.error('Messages snapshot error:', err);
    }
  );
}
