import { auth } from './firebase';

// ImageKit upload uses direct fetch — SDK not needed
// Keeping stub so named export `imagekit` doesn't break imports
const imagekit = null;

export const IMAGEKIT_URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/8ewg8di9l";

// Ask our server (api/imagekit-auth.js) to sign one upload. The private key stays on the server.
async function getUploadAuth() {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error('Please log in to upload photos.');
  const res = await fetch('/api/imagekit-auth', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({}));
    throw new Error(error || `Upload authorization failed (${res.status})`);
  }
  return res.json();
}

/**
 * Upload image to ImageKit with a signature from our server (signed upload).
 * Includes 3x automatic retry with exponential backoff.
 *
 * @param {File|Blob} file - The file to upload
 * @param {string} fileName - Name for the file
 * @param {string} folder - Folder path (e.g., 'classes/gallery')
 * @returns {Promise<{url: string, fileId: string}>}
 */
export async function uploadToImageKit(file, fileName, folder = '') {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 30000;
  const PUBLIC_KEY = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Each signature works once, so get a fresh one per attempt
      const { token, expire, signature } = await getUploadAuth();
      const fd = new FormData();
      fd.append('file', file);
      fd.append('fileName', fileName);
      fd.append('publicKey', PUBLIC_KEY);
      fd.append('token', token);
      fd.append('expire', expire);
      fd.append('signature', signature);
      if (folder) fd.append('folder', folder);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: fd,
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`ImageKit upload failed (${res.status}): ${errText}`);
      }

      const result = await res.json();
      return { url: result.url, fileId: result.fileId, name: result.name };

    } catch (error) {
      if (attempt === MAX_RETRIES) {
        console.error(`ImageKit upload failed after ${MAX_RETRIES} attempts:`, error);
        throw error;
      }
      const wait = 1000 * Math.pow(2, attempt - 1);
      console.warn(`ImageKit attempt ${attempt} failed. Retrying in ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

/**
 * Get optimized image URL from ImageKit
 */
export function getImageKitURL(path, transformations = {}) {
  if (!path) return '';
  if (path.includes('ik.imagekit.io')) return path;

  const transformArray = [];
  if (transformations.width)   transformArray.push(`w-${transformations.width}`);
  if (transformations.height)  transformArray.push(`h-${transformations.height}`);
  if (transformations.quality) transformArray.push(`q-${transformations.quality}`);

  const tr = transformArray.length > 0 ? `tr:${transformArray.join(',')}` : '';
  return `${IMAGEKIT_URL_ENDPOINT}/${tr}/${path}`;
}

export { imagekit };
