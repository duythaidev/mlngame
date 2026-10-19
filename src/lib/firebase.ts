// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { browserSessionPersistence, getAuth, initializeAuth, signInAnonymously } from "firebase/auth";

const app = initializeApp({
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FB_DATABASE_URL,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
});

export const db = getDatabase(app);

function makeAuth() {
  try {
    return initializeAuth(app, { persistence: browserSessionPersistence });
  } catch {
    return getAuth(app); // HMR chạy lại module: auth đã khởi tạo
  }
}
export const auth = makeAuth();

let pending: Promise<void> | null = null;

/** Đăng nhập ẩn danh đúng 1 lần (nhiều hook gọi cùng lúc cũng chỉ tạo 1 user). */
export function ensureSignedIn(): Promise<void> {
  pending ??= auth.authStateReady().then(async () => {
    if (!auth.currentUser) await signInAnonymously(auth);
  });
  return pending;
}
