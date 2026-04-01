import ImageKit from 'imagekit-javascript';

// Initialize ImageKit
const imagekit = new ImageKit({
  publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || "public_your_key_here",
  urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/8ewg8di9l",
  authenticationEndpoint: import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT || ""
});

export const IMAGEKIT_URL_ENDPOINT = import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || "https://ik.imagekit.io/8ewg8di9l";

/**
 * Upload image to ImageKit
 * @param {File|Blob} file - The file to upload
 * @param {string} fileName - Name for the file
 * @param {string} folder - Folder path (e.g., 'classes/gallery')
 * @returns {Promise<{url: string, fileId: string}>}
 */
export async function uploadToImageKit(file, fileName, folder = '') {
  try {
    // For client-side upload, we need to get auth parameters
    // This is a simple implementation - in production, you'd get these from your backend
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', fileName);
    if (folder) {
      formData.append('folder', folder);
    }
    formData.append('publicKey', import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || "public_your_key_here");
    
    // Direct upload using fetch (since we don't have authentication endpoint)
    // Note: For production, you should implement proper authentication endpoint
    const uploadResponse = await fetch('https://upload.imagekit.io/api/v1/files/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(import.meta.env.VITE_IMAGEKIT_PRIVATE_KEY + ':')}`,
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error('ImageKit upload failed');
    }

    const result = await uploadResponse.json();
    return {
      url: result.url,
      fileId: result.fileId,
      name: result.name
    };
  } catch (error) {
    console.error('ImageKit upload error:', error);
    throw error;
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
