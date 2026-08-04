/**
 * Compresses/resizes an image file in the browser before it's sent to the API.
 *
 * Phone camera photos are often 3-12MB. Base64-encoding adds ~37% overhead,
 * and Vercel serverless functions reject request bodies over ~4.5MB — so a
 * raw camera photo can silently fail ("Failed to read image") or take a long
 * time to upload on mobile data. Downscaling + re-encoding as JPEG fixes both.
 */
export function compressImage(
  file: File,
  maxDimension = 1600,
  quality = 0.75
): Promise<{ data: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not process image on this device.'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        reject(new Error('Could not read that image. Try a different photo.'));
        return;
      }
      resolve({ data: base64, mimeType: 'image/jpeg' });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read that image. Try a different photo.'));
    };

    img.src = objectUrl;
  });
}
