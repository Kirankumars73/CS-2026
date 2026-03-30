import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

const AuthContext = createContext(null);

const CLASS_ID = import.meta.env.VITE_CLASS_ID || 'cs2026';
const ADMIN_EMAIL = 'kirankumar07112003@gmail.com';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [memberProfile, setMemberProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = currentUser?.email === ADMIN_EMAIL;

  // Load member profile from Firestore
  async function loadMemberProfile(uid) {
    try {
      const ref = doc(db, 'classes', CLASS_ID, 'members', uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setMemberProfile({ id: snap.id, ...snap.data() });
        return snap.data();
      }
      setMemberProfile(null);
      return null;
    } catch (err) {
      console.error('Failed to load member profile:', err);
      setMemberProfile(null);
      return null;
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadMemberProfile(user.uid);
      } else {
        setMemberProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  // Step 1: Sign in with Google popup
  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  }

  // Step 2: Verify secret code and create/update member doc
  async function verifyAndJoin(user, secretCode) {
    const expected = import.meta.env.VITE_CLASS_SECRET_CODE;
    if (secretCode.trim() !== expected) {
      await signOut(auth);
      throw new Error('Incorrect class code. Please try again.');
    }

    // Create or update member document
    const ref = doc(db, 'classes', CLASS_ID, 'members', user.uid);
    const snap = await getDoc(ref);
    const isNewMember = !snap.exists();

    if (isNewMember) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        photoURL: user.photoURL || '',
        name: user.displayName || '',
        rollNumber: '',

        bio: '',
        quote: '',
        profilePhoto: user.photoURL || '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, { updatedAt: serverTimestamp() }, { merge: true });
    }

    const profile = await loadMemberProfile(user.uid);
    return { isNewMember, profile };
  }

  async function logout() {
    await signOut(auth);
    setMemberProfile(null);
  }

  async function refreshProfile() {
    if (currentUser) {
      await loadMemberProfile(currentUser.uid);
    }
  }

  const value = {
    currentUser,
    memberProfile,
    loading,
    isAdmin,
    loginWithGoogle,
    verifyAndJoin,
    logout,
    refreshProfile,
    CLASS_ID,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
