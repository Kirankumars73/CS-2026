// ImageKit upload uses direct fetch — SDK not needed
// Keeping stub so named export `imagekit` doesn't break imports
const imagekit = null;

export const IMAGEKIT_URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/8ewg8di9l";

/**
 * Upload image to ImageKit using public-key unauthenticated client-side upload.
 * Requires "Restrict unauthenticated media uploads" = OFF in ImageKit dashboard.
 * Includes automatic retry with exponential backoff for reliability.
 *
 * @param {File|Blob} file - The file to upload
 * @param {string} fileName - Name for the file
 * @param {string} folder - Folder path (e.g., 'classes/gallery')
 * @returns {Promise<{url: string, fileId: string}>}
 */
export async function uploadToImageKit(file, fileName, folder = '') {
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 30000; // 30 seconds per attempt

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileName', fileName);
      formData.append('publicKey', import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || '');
      if (folder) {
        formData.append('folder', folder);
      }
      // No Authorization header — public key only (unauthenticated upload)
      // This is the correct client-side approach; private key must never be in the browser

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!uploadResponse.ok) {
        const errText = await uploadResponse.text().catch(() => '');
        throw new Error(`ImageKit upload failed (${uploadResponse.status}): ${errText}`);
      }

      const result = await uploadResponse.json();
      return {
        url: result.url,
        fileId: result.fileId,
        name: result.name,
      };

    } catch (error) {
      const isLast = attempt === MAX_RETRIES;
      const isAbort = error.name === 'AbortError';

      if (isLast) {
        console.error(`ImageKit upload failed after ${MAX_RETRIES} attempts:`, error);
        throw error;
      }

      // Exponential backoff: wait 1s, then 2s, then 4s before retrying
      const wait = 1000 * Math.pow(2, attempt - 1);
      console.warn(`ImageKit attempt ${attempt} failed (${isAbort ? 'timeout' : error.message}). Retrying in ${wait / 1000}s...`);
      await new Promise(r => setTimeout(r, wait));
    }
  }
}

/**
 * Get optimized image URL from ImageKit
 * @param {string} path - Image path or URL
 * @param {object} transformations - ImageKit transformations
 * @returns {string}
 */
export function getImageKitURL(path, transformations = {}) {
  if (!path) return '';

  // If it's already a full ImageKit URL, return as is
  if (path.includes('ik.imagekit.io')) {
    return path;
  }

  // Build transformation string
  const transformArray = [];
  if (transformations.width) transformArray.push(`w-${transformations.width}`);
  if (transformations.height) transformArray.push(`h-${transformations.height}`);
  if (transformations.quality) transformArray.push(`q-${transformations.quality}`);

  const transformString = transformArray.length > 0 ? `tr:${transformArray.join(',')}` : '';

  return `${IMAGEKIT_URL_ENDPOINT}/${transformString}/${path}`;
}

export { imagekit };
