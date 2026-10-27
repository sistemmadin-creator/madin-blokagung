/**
 * Helper Fase 3: Quick Scan & QR Code Payload Parser / Generator.
 * Memfasilitasi presensi kilat dan setoran hafalan menggunakan barcode/QR scanner.
 */

export interface ParsedQRResult {
  type: 'SANTRI' | 'ASATIDZ' | 'UNKNOWN';
  id: string; // no_induk atau nia
  nama: string;
  tingkat?: string;
  kelas?: string;
  raw: string;
}

export const QRCodeHelper = {
  /**
   * Membuat string payload QR Code standar untuk Santri
   * Format: MADIN:SANTRI:<no_induk>:<nama>:<tingkat>:<kelas>
   */
  generateSantriPayload(
    noInduk: string,
    nama: string,
    tingkat = '',
    kelas = ''
  ): string {
    return `MADIN:SANTRI:${noInduk.trim()}:${nama.trim()}:${tingkat.trim()}:${kelas.trim()}`;
  },

  /**
   * Membuat string payload QR Code standar untuk Asatidz
   * Format: MADIN:ASATIDZ:<nia>:<nama>
   */
  generateAsatidzPayload(nia: string, nama: string): string {
    return `MADIN:ASATIDZ:${nia.trim()}:${nama.trim()}`;
  },

  /**
   * Membaca dan mengurai hasil scan Barcode/QR Code (baik dari scanner USB maupun kamera)
   */
  parseScanInput(rawInput: string): ParsedQRResult {
    const raw = String(rawInput || '').trim();

    // Pola format resmi Madin: MADIN:TIPE:ID:NAMA:...
    if (raw.startsWith('MADIN:SANTRI:')) {
      const parts = raw.split(':');
      return {
        type: 'SANTRI',
        id: parts[2] || '',
        nama: parts[3] || '',
        tingkat: parts[4] || '',
        kelas: parts[5] || '',
        raw,
      };
    }

    if (raw.startsWith('MADIN:ASATIDZ:')) {
      const parts = raw.split(':');
      return {
        type: 'ASATIDZ',
        id: parts[2] || '',
        nama: parts[3] || '',
        raw,
      };
    }

    // Fallback: Jika input berupa angka murni NIS atau kode pendek NIA
    if (/^\d{3,}$/.test(raw)) {
      return {
        type: 'SANTRI',
        id: raw,
        nama: '',
        raw,
      };
    }

    if (/^[A-Za-z]\d{1,4}$/.test(raw)) {
      return {
        type: 'ASATIDZ',
        id: raw,
        nama: '',
        raw,
      };
    }

    return {
      type: 'UNKNOWN',
      id: raw,
      nama: raw,
      raw,
    };
  },
};
