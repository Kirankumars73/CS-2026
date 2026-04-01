import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { uploadToImageKit } from '../imagekit';

/**
 * Compress an image file using canvas before uploading.
 * Returns a compressed Blob (JPEG).
 *
 * @param {File} file - The original image file
 * @param {number} maxWidth - Maximum width in px (default 800)
 * @param {number} maxHeight - Maximum height in px (default 800)
 * @param {number} quality - JPEG quality 0–1 (default 0.7)
 * @returns {Promise<Blob>} compressed image blob
 */
export function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        // Draw to canvas
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Export as JPEG blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas compression failed'));
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload image to both Firebase Storage and ImageKit
 * @param {Blob} compressedBlob - Compressed image blob
 * @param {string} firebasePath - Firebase storage path
 * @param {string} imagekitPath - ImageKit folder path
 * @param {string} fileName - File name
 * @returns {Promise<{firebaseUrl: string, imagekitUrl: string}>}
 */
export async function uploadToBothServices(compressedBlob, firebasePath, imagekitPath, fileName) {
  try {
    // Upload to Firebase
    const storageRef = ref(storage, firebasePath);
    await uploadBytes(storageRef, compressedBlob);
    const firebaseUrl = await getDownloadURL(storageRef);

    // Upload to ImageKit
    let imagekitUrl = '';
    try {
      const imagekitResult = await uploadToImageKit(compressedBlob, fileName, imagekitPath);
      imagekitUrl = imagekitResult.url;
    } catch (ikError) {
      console.warn('ImageKit upload failed, continuing with Firebase only:', ikError);
    }

    return {
      firebaseUrl,
      imagekitUrl,
      url: firebaseUrl // Default to Firebase URL for backwards compatibility
    };
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}
