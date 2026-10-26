import { createContext, useContext, useEffect, useState } from 'react';
import { getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';
import { saveDetails } from '../utils/details';

const AuthContext = createContext(null);

const CLASS_ID = import.meta.env.VITE_CLASS_ID || 'cs2026';
const ADMIN_EMAIL = 'kirankumar07112003@gmail.com';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [memberProfile, setMemberProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  // Full-page Google sign-in that came back still needing the secret code: { user } or { error }
  const [redirectSignIn, setRedirectSignIn] = useState(null);

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

  // Back from a full-page Google sign-in: members are simply signed in,
  // anyone else still has to enter the secret code
  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result && !(await loadMemberProfile(result.user.uid))) {
          setRedirectSignIn({ user: result.user });
        }
      })
      .catch((error) => setRedirectSignIn({ error }));
  }, []);

  // Step 1: Sign in with Google popup. Existing members skip the secret code.
  async function loginWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const profile = await loadMemberProfile(result.user.uid);
    return { user: result.user, isMember: !!profile };
  }

  // Step 1 fallback when the popup is blocked: sign in in this tab (picked up by getRedirectResult).
  // Only works once authDomain is this site (auth pages proxied in vercel.json); otherwise Firefox
  // and Safari strand the user on Firebase's "missing initial state" page.
  async function loginWithGoogleRedirect() {
    if (auth.config.authDomain !== window.location.host) {
      throw new Error('Redirect sign-in needs authDomain set to this site');
    }
    return signInWithRedirect(auth, googleProvider);
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
      // Email lives in the members-only details record, not the public profile.
      // Don't let a failure here block joining; Edit Profile saves it again.
      await saveDetails(CLASS_ID, user.uid, { email: user.email })
        .catch(err => console.error('Could not save email to details:', err));
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
    loginWithGoogleRedirect,
    redirectSignIn,
    clearRedirectSignIn: () => setRedirectSignIn(null),
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
