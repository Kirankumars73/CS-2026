import crypto from 'node:crypto';

// Signs ImageKit uploads for signed-in class members, so the private key never reaches the browser.
// IMAGEKIT_PRIVATE_KEY must NOT start with VITE_ — Vite would bundle it into the public JS.

const API_KEY = process.env.VITE_FIREBASE_API_KEY;
const PROJECT_ID = process.env.VITE_FIREBASE_PROJECT_ID;
const CLASS_ID = process.env.VITE_CLASS_ID || 'cs2026';

export async function GET(request) {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey) {
    return Response.json({ error: 'Uploads are not configured' }, { status: 500 });
  }

  const idToken = request.headers.get('authorization')?.replace(/^Bearer /, '');
  const uid = idToken ? await verifyFirebaseUser(idToken) : null;
  if (!uid) {
    return Response.json({ error: 'Please log in to upload photos.' }, { status: 401 });
  }
  if (!(await isMember(uid))) {
    return Response.json({ error: 'Only class members can upload photos.' }, { status: 403 });
  }

  // https://imagekit.io/docs/api-reference/upload-file/upload-file#how-to-implement-client-side-file-upload
  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 10 * 60; // ImageKit allows at most 1 hour
  const signature = crypto.createHmac('sha1', privateKey).update(token + expire).digest('hex');

  return Response.json({ token, expire, signature }, { headers: { 'Cache-Control': 'no-store' } });
}

// Firebase Auth checks the ID token (signature, expiry, project) and returns the user's uid
async function verifyFirebaseUser(idToken) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data.users?.[0]?.localId ?? null;
}

// Member profiles are publicly readable (firestore.rules), so no credentials are needed
async function isMember(uid) {
  const res = await fetch(
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/classes/${CLASS_ID}/members/${uid}?key=${API_KEY}`
  );
  return res.ok;
}
