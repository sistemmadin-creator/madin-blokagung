/**
 * Utility untuk menghitung delta diff antar objek (field-level inversion)
 * Mendukung pencegahan konflik dan overwriting pada konkurensi multi-pengguna.
 */

export interface FieldDeltaResult<T> {
  prevDelta: Partial<T>;
  nextDelta: Partial<T>;
  changedKeys: string[];
  hasChanges: boolean;
}

/**
 * Menghitung perbedaan field antar 2 objek.
 * @param prev Objek sebelum perubahan
 * @param next Objek sesudah perubahan
 * @param ignoredKeys Daftar kolom yang diabaikan (misal id, created_at, updated_at)
 * @returns prevDelta (nilai lama untuk undo), nextDelta (nilai baru untuk redo), dan daftar kolom yang berubah
 */
export function calculateFieldDelta<T extends Record<string, any>>(
  prev: T | null | undefined,
  next: T | null | undefined,
  ignoredKeys: string[] = ['id', 'created_at', 'updated_at']
): FieldDeltaResult<T> {
  const prevDelta: Partial<T> = {};
  const nextDelta: Partial<T> = {};
  const changedKeys: string[] = [];

  if (!prev && !next) {
    return { prevDelta, nextDelta, changedKeys, hasChanges: false };
  }

  const allKeys = Array.from(
    new Set([...Object.keys(prev || {}), ...Object.keys(next || {})])
  );

  allKeys.forEach((key) => {
    if (ignoredKeys.includes(key)) return;

    const vPrev = prev ? prev[key] : undefined;
    const vNext = next ? next[key] : undefined;

    // Normalisasi nilai null/undefined atau perbandingan string/objek
    const isDifferent =
      typeof vPrev === 'object' || typeof vNext === 'object'
        ? JSON.stringify(vPrev ?? null) !== JSON.stringify(vNext ?? null)
        : (vPrev ?? '') !== (vNext ?? '');

    if (isDifferent) {
      changedKeys.push(key);
      if (vPrev !== undefined) {
        prevDelta[key as keyof T] = vPrev;
      }
      if (vNext !== undefined) {
        nextDelta[key as keyof T] = vNext;
      }
    }
  });

  return {
    prevDelta,
    nextDelta,
    changedKeys,
    hasChanges: changedKeys.length > 0,
  };
}
