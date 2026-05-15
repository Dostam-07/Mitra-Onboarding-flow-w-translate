import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp, deleteField } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0703356528",
  appId: "1:485573076578:web:4d026c32b55c91aafc533b",
  apiKey: "AIzaSyCpIjUm-22X9O4Rz8x_H87n2E7nMTyIy90",
  authDomain: "gen-lang-client-0703356528.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-728fad41-b5ce-4d13-a695-8e15f3ed2cec",
  storageBucket: "gen-lang-client-0703356528.firebasestorage.app",
  messagingSenderId: "485573076578",
  measurementId: "",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function syncSession(sessionId: string, data: any, isNew: boolean = false) {
  const path = `sessions/${sessionId}`;
  console.log(`${isNew ? 'Creating' : 'Updating'} session: ${sessionId}`);
  try {
    const payload = JSON.parse(JSON.stringify(data));
    payload.updatedAt = serverTimestamp();

    if (isNew) {
      payload.createdAt = serverTimestamp();
    }

    if (payload.telemetry && payload.telemetry.stepDropOff === null) {
      payload.telemetry.stepDropOff = deleteField();
    }

    await setDoc(doc(db, 'sessions', sessionId), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}
