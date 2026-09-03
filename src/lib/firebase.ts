import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODAS AS CONFIGURAÇÕES SENSÍVEIS SÃO CARREGADAS VIA VARIÁVEIS DE AMBIENTE (VITE_FIREBASE_*)
// O repositório permanece 100% seguro para código aberto sem expor credenciais reais no Git.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '',
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.apiKey !== 'SUA_FIREBASE_API_KEY'
);

// Inicialização segura: utiliza credenciais de ambiente ou fallback neutro para repositórios públicos
const app = getApps().length > 0
  ? getApp()
  : initializeApp(
      isFirebaseConfigured
        ? firebaseConfig
        : {
            apiKey: 'demo-api-key',
            authDomain: 'demo-open-source.firebaseapp.com',
            projectId: 'demo-project',
            storageBucket: 'demo-open-source.appspot.com',
            messagingSenderId: '000000000000',
            appId: '1:000000000000:web:000000000000',
          }
    );

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const db =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

export default app;
