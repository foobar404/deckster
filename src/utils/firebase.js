import { getApp, getApps, initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBWab0Y4Tz3xRGi8bsAVdp1003VzW6zTR4',
  authDomain: 'deckster-4a788.firebaseapp.com',
  projectId: 'deckster-4a788',
  appId: '1:856522530056:web:6e37e4e0a6714c7aec20bd',
  storageBucket: 'deckster-4a788.firebasestorage.app',
  messagingSenderId: '856522530056',
  measurementId: 'G-V9FST0VTS0'
}

export const firebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
)

const firebaseApp = firebaseConfigured
  ? getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)
  : null

export const firebaseAuth = firebaseApp ? getAuth(firebaseApp) : null
export const firebaseDb = firebaseApp ? getFirestore(firebaseApp) : null