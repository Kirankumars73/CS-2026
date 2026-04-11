// ImageKit upload uses direct fetch — SDK not needed
// Keeping stub so named export `imagekit` doesn't break imports
const imagekit = null;

export const IMAGEKIT_URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/8ewg8di9l";

/**
 * Upload image to ImageKit.
 * Strategy:
 *   1. Try unauthenticated upload (public key only) — works once you turn OFF
 *      "Restrict unauthenticated media uploads" in ImageKit dashboard.
 *   2. If ImageKit returns 400/401, fall back to private key auth automatically.
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
  const PUBLIC_KEY  = import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY  || '';
  const PRIVATE_KEY = import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY || '';

  const buildForm = () => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('fileName', fileName);
    fd.append('publicKey', PUBLIC_KEY);
    if (folder) fd.append('folder', folder);
    return fd;
  };

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      // First: try unauthenticated (public key only)
      let res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: buildForm(),
        signal: controller.signal,
      });

      // Fallback: if auth is missing, use private key (until dashboard toggle is set)
      if ((res.status === 400 || res.status === 401) && PRIVATE_KEY) {
        const controller2 = new AbortController();
        const timer2 = setTimeout(() => controller2.abort(), TIMEOUT_MS);
        res = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
          method: 'POST',
          headers: { 'Authorization': `Basic ${btoa(PRIVATE_KEY + ':')}` },
          body: buildForm(),
          signal: controller2.signal,
        });
        clearTimeout(timer2);
      }

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
