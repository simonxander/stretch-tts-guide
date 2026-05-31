import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as firebaseSignOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc 
} from 'firebase/firestore';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDeuwjlrriFqlhR3JVV9rvZ6ZptJuBmgeE",
  authDomain: "zenstretch-sync.firebaseapp.com",
  projectId: "zenstretch-sync",
  storageBucket: "zenstretch-sync.firebasestorage.app",
  messagingSenderId: "1089664299968",
  appId: "1:1089664299968:web:12378283d000031e578e25",
  measurementId: "G-CGXCZDEGHL"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

export let currentUser = null;
let authStateCallback = null;

// Listen for auth state changes
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (authStateCallback) {
    authStateCallback(user);
  }
});

// Register callback for UI updates
export function onAuthChange(callback) {
  authStateCallback = callback;
  // Trigger immediately if already loaded
  if (currentUser !== undefined) {
    callback(currentUser);
  }
}

// Sign in
export async function signIn() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
}

// Sign out
export async function signOut() {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
}

// Keys to sync
const SYNC_KEYS = [
  'zenstretch_custom_routines',
  'zenstretch_tts_settings',
  'zenstretch_hide_presets'
];

// Save local data to Firebase
export async function syncToCloud() {
  if (!currentUser) return;
  
  const dataToSync = {};
  SYNC_KEYS.forEach(key => {
    const val = localStorage.getItem(key);
    if (val !== null) {
      dataToSync[key] = val;
    }
  });

  try {
    const userRef = doc(db, 'users', currentUser.uid);
    await setDoc(userRef, {
      settings: dataToSync,
      lastUpdatedAt: new Date().toISOString()
    }, { merge: true });
    console.log('Data synced to Firebase successfully.');
  } catch (error) {
    console.error('Error syncing to Firebase:', error);
  }
}

// Load data from Firebase and overwrite local storage
export async function syncFromCloud() {
  if (!currentUser) return false;

  try {
    const userRef = doc(db, 'users', currentUser.uid);
    const docSnap = await getDoc(userRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.settings) {
        let changed = false;
        let needsUpload = false;
        SYNC_KEYS.forEach(key => {
          if (data.settings[key] !== undefined) {
            const currentLocal = localStorage.getItem(key);
            
            if (key === 'zenstretch_custom_routines') {
              try {
                const localArr = currentLocal ? JSON.parse(currentLocal) : [];
                const cloudArr = JSON.parse(data.settings[key]);
                
                const mergedMap = new Map();
                localArr.forEach(r => mergedMap.set(r.id, r));
                
                cloudArr.forEach(cloudR => {
                  const localR = mergedMap.get(cloudR.id);
                  if (!localR) {
                    mergedMap.set(cloudR.id, cloudR);
                  } else {
                    const localTime = localR.updatedAt || 0;
                    const cloudTime = cloudR.updatedAt || 0;
                    if (cloudTime > localTime) {
                      mergedMap.set(cloudR.id, cloudR);
                    }
                  }
                });
                
                const mergedArr = Array.from(mergedMap.values());
                const mergedJson = JSON.stringify(mergedArr);
                
                if (mergedJson !== data.settings[key]) {
                  needsUpload = true;
                }
                
                if (currentLocal !== mergedJson) {
                  localStorage.setItem(key, mergedJson);
                  changed = true;
                }
              } catch (e) {
                console.error('Merge error:', e);
                if (currentLocal !== data.settings[key]) {
                  localStorage.setItem(key, data.settings[key]);
                  changed = true;
                }
              }
            } else {
              if (currentLocal !== data.settings[key]) {
                localStorage.setItem(key, data.settings[key]);
                changed = true;
              }
            }
          }
        });
        
        if (needsUpload) {
          setTimeout(() => syncToCloud(), 1000);
        }
        console.log('Data loaded from Firebase successfully.');
        return changed; // return true if anything was updated
      }
    }
    return false;
  } catch (error) {
    console.error('Error loading from Firebase:', error);
    return false;
  }
}
