/**
 * Utilitas pemrosesan, kompresi, dan pemotongan (crop) foto santri & asatidz
 * Menggunakan HTML5 Canvas client-side untuk menghasilkan file JPEG ringan (~100-200KB).
 */

export function compressImageFile(
  file: File | Blob,
  maxDim = 600,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('Canvas compression hanya didukung di browser.'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDim) {
            height = Math.round(height * (maxDim / width));
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Gagal mendapatkan 2D context canvas.'));
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Memotong video langsung (webcam) dengan rasio pas foto 3x4 (portrait)
 * dan mengonversi menjadi Base64 JPEG terkompresi.
 */
export function cropVideoTo3x4(
  video: HTMLVideoElement,
  targetWidth = 450,
  quality = 0.8
): string {
  const targetHeight = Math.round((targetWidth * 4) / 3); // 450x600 px (3:4)
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const vWidth = video.videoWidth || 640;
  const vHeight = video.videoHeight || 480;

  // Hitung source rectangle di tengah video dengan rasio 3:4
  const targetRatio = 3 / 4;
  const videoRatio = vWidth / vHeight;

  let sWidth = vWidth;
  let sHeight = vHeight;
  let sx = 0;
  let sy = 0;

  if (videoRatio > targetRatio) {
    // Video lebih lebar daripada 3:4, potong samping kiri-kanan
    sWidth = Math.round(vHeight * targetRatio);
    sx = Math.round((vWidth - sWidth) / 2);
  } else {
    // Video lebih tinggi daripada 3:4, potong atas-bawah
    sHeight = Math.round(vWidth / targetRatio);
    sy = Math.round((vHeight - sHeight) / 2);
  }

  ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', quality);
}
