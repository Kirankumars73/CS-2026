import { uploadToImageKit } from '../imagekit';

/**
 * Read the EXIF orientation tag from a JPEG file's raw bytes.
 * Returns a number 1–8 (1 = normal). Returns 1 if not found or non-JPEG.
 */
function getExifOrientation(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const view = new DataView(e.target.result);
      // Must start with JPEG SOI marker FF D8
      if (view.getUint16(0) !== 0xffd8) { resolve(1); return; }
      let offset = 2;
      while (offset < view.byteLength) {
        if (view.getUint16(offset) === 0xffe1) {
          // APP1 marker — check for Exif header
          if (view.getUint32(offset + 4) !== 0x45786966) { resolve(1); return; } // "Exif"
          const little = view.getUint16(offset + 10) === 0x4949; // byte order
          const ifdOffset = offset + 10 + view.getUint32(offset + 14, little);
          const tags = view.getUint16(ifdOffset, little);
          for (let i = 0; i < tags; i++) {
            if (view.getUint16(ifdOffset + 2 + i * 12, little) === 0x0112) {
              resolve(view.getUint16(ifdOffset + 2 + i * 12 + 8, little));
              return;
            }
          }
        } else if ((view.getUint16(offset) & 0xff00) !== 0xff00) {
          break;
        }
        offset += 2 + view.getUint16(offset + 2);
      }
      resolve(1);
    };
    reader.onerror = () => resolve(1);
    reader.readAsArrayBuffer(file.slice(0, 131072));
  });
}

/**
 * Compress an image file using canvas before uploading.
 * Automatically corrects EXIF rotation (fixes sideways phone photos).
 * Returns a compressed Blob (JPEG).
 */
export async function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
  const orientation = await getExifOrientation(file);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const rotated = orientation >= 5 && orientation <= 8;
        const srcW = rotated ? height : width;
        const srcH = rotated ? width : height;
        let outW = srcW;
        let outH = srcH;
        if (outW > maxWidth || outH > maxHeight) {
          const ratio = Math.min(maxWidth / outW, maxHeight / outH);
          outW = Math.round(outW * ratio);
          outH = Math.round(outH * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        ctx.save();
        switch (orientation) {
          case 2: ctx.transform(-1, 0, 0, 1, outW, 0); break;
          case 3: ctx.transform(-1, 0, 0, -1, outW, outH); break;
          case 4: ctx.transform(1, 0, 0, -1, 0, outH); break;
          case 5: ctx.transform(0, 1, 1, 0, 0, 0); break;
          case 6: ctx.transform(0, 1, -1, 0, outH, 0); break;
          case 7: ctx.transform(0, -1, -1, 0, outH, outW); break;
          case 8: ctx.transform(0, -1, 1, 0, 0, outW); break;
          default: break;
        }
        ctx.drawImage(img, 0, 0, rotated ? outH : outW, rotated ? outW : outH);
        ctx.restore();
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error('Canvas compression failed'));
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
 * Compress and upload an image to ImageKit only.
 * Firebase Storage is no longer used — ImageKit handles all media.
 *
 * @param {Blob} compressedBlob - Already-compressed image blob
 * @param {string} imagekitPath - ImageKit folder path
 * @param {string} fileName - File name
 * @returns {Promise<{url: string, fileId: string, imagekitUrl: string}>}
 */
export async function uploadToImageKitOnly(compressedBlob, imagekitPath, fileName) {
  const result = await uploadToImageKit(compressedBlob, fileName, imagekitPath);
  return {
    url: result.url,
    fileId: result.fileId,
    imagekitUrl: result.url,
    firebaseUrl: result.url, // backwards-compat alias
  };
}

/**
 * @deprecated Use uploadToImageKitOnly instead.
 * Kept so any remaining import doesn't crash — silently redirects to ImageKit only.
 */
export async function uploadToBothServices(compressedBlob, _firebasePath, imagekitPath, fileName) {
  return uploadToImageKitOnly(compressedBlob, imagekitPath, fileName);
}
