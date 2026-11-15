/**
 * Memvalidasi dan menormalkan URL eksternal agar hanya mengizinkan skema http:// atau https://
 * serta menolak javascript:, data:, vbscript:, dan URL protocol-relative (//).
 */
export function sanitizeHttpUrl(rawUrl: string | null | undefined): string | null {
  if (typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/\\')) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    if (parsed.username || parsed.password) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Mengecek apakah string adalah path relatif lokal yang aman (diawali satu '/' dan bukan '//')
 * atau URL HTTP/HTTPS absolut yang valid.
 */
export function isSafeRelativeOrHttpUrl(rawUrl: string | null | undefined): boolean {
  if (rawUrl === null || rawUrl === undefined) return true;
  if (typeof rawUrl !== 'string') return false;

  const trimmed = rawUrl.trim();
  if (!trimmed) return true;

  if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || /[\u0000-\u001F\u007F]/.test(trimmed)) {
    return false;
  }

  if (trimmed.startsWith('/')) {
    return true;
  }

  return sanitizeHttpUrl(trimmed) !== null;
}

/**
 * Mengembalikan URL relatif/HTTP(S) yang sudah disanitasi, atau fallback jika tidak aman.
 */
export function sanitizeRelativeOrHttpUrl(
  rawUrl: string | null | undefined,
  fallback = '#'
): string {
  if (typeof rawUrl !== 'string') return fallback;
  const trimmed = rawUrl.trim();
  if (!trimmed) return fallback;

  if (
    trimmed.startsWith('/') &&
    !trimmed.startsWith('//') &&
    !trimmed.startsWith('/\\') &&
    !/[\u0000-\u001F\u007F]/.test(trimmed)
  ) {
    return trimmed;
  }

  return sanitizeHttpUrl(trimmed) ?? fallback;
}

/**
 * Mencegah CSV / Spreadsheet Formula Injection (CWE-1236) pada sel teks yang diawali
 * karakter pemicu formula (=, +, -, @, Tab, CR) tanpa merusak tipe angka (number).
 */
export function sanitizeSpreadsheetCell<T>(value: T): T {
  if (typeof value !== 'string') {
    return value;
  }
  if (value === '-' || value === '') {
    return value;
  }
  if (/^[=+\-@\t\r]/.test(value)) {
    return `'${value}` as unknown as T;
  }
  return value;
}

/**
 * Memformat satu nilai sel menjadi sel CSV yang aman sesuai RFC 4180 + anti-Formula Injection.
 */
export function formatSafeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  const safeStr = sanitizeSpreadsheetCell(String(value));
  return `"${safeStr.replace(/"/g, '""')}"`;
}
