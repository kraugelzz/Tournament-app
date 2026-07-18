import { initializeApp } from "firebase/app";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  memoryLocalCache,
} from "firebase/firestore";

// Firebase web config is public client config (safe to ship in the bundle);
// data access is protected by Firestore security rules, not by hiding these.
// Env vars override these defaults when provided.
const app = initializeApp({
  apiKey: import.meta.env.VITE_FB_API_KEY ?? "AIzaSyCLu9Cbe0Oc13SMRTT2LDf0zVrLWDPgLNc",
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN ?? "tournament-app-419dc.firebaseapp.com",
  projectId: import.meta.env.VITE_FB_PROJECT_ID ?? "tournament-app-419dc",
  storageBucket: import.meta.env.VITE_FB_STORAGE_BUCKET ?? "tournament-app-419dc.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FB_MESSAGING_SENDER_ID ?? "290520374822",
  appId: import.meta.env.VITE_FB_APP_ID ?? "1:290520374822:web:8d0729d874fee9b4c850e7",
});

const localCache =
  typeof indexedDB !== "undefined"
    ? persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    : memoryLocalCache();

export const db = initializeFirestore(app, {
  localCache,
  ignoreUndefinedProperties: true,
  // Auto-detect long-polling: falls back from the WebChannel/gRPC-web stream to
  // HTTP long-polling on networks/proxies that block it, so writes actually reach
  // the backend instead of hanging.
  experimentalAutoDetectLongPolling: true,
});
