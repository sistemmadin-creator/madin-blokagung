import QRCode from 'qrcode';

export interface QrSvgMatrix {
  size: number;
  path: string;
}

/**
 * Menghasilkan path SVG QR Code secara sinkron di sisi klien/server
 * tanpa ketergantungan jaringan eksternal.
 */
export function generateQrSvgPath(value: string): QrSvgMatrix {
  const safeValue = value.trim() || 'https://madinablokagung.vercel.app/setor-mustahiq';
  const qr = QRCode.create(safeValue, {
    errorCorrectionLevel: 'M',
  });

  const size = qr.modules.size;
  const data = qr.modules.data;
  const segments: string[] = [];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (data[y * size + x]) {
        segments.push(`M${x + 1},${y + 1}h1v1h-1z`);
      }
    }
  }

  return {
    size: size + 2,
    path: segments.join(''),
  };
}

/**
 * Membentuk URL deep-link langsung menuju Modal Input Setoran Santri (Gambar 2)
 */
export function buildSantriSetorMustahiqUrl(
  origin: string,
  noInduk: string,
  tahun: number
): string {
  const base = origin ? origin.replace(/\/+$/, '') : '';
  return `${base}/setor-mustahiq?santri=${encodeURIComponent(noInduk.trim())}&tahun=${tahun}`;
}
