export type DeleteHistoryMode = 'keep_history' | 'purge_all';

export interface DeleteTargetSummaryItem {
  code: string;
  name: string;
  meta?: string;
}

export interface DeleteHistoryOptionText {
  sectionTitle: string;
  keepLabel: string;
  keepDesc: string;
  purgeLabel: string;
  purgeDesc: string;
}

export interface DeleteImpactAnalysis {
  items: DeleteTargetSummaryItem[];
  impacts: string[];
  activeWarnings: string[];
  activeWarningTitle?: string;
  activeRiskCheckboxLabel?: string;
  safeArchiveNote?: string;
  hasHistoricalRecords: boolean;
}

const DELETED_TAG = '[Dihapus]';

/**
 * Menambahkan penanda `[Dihapus]` di akhir nama arsip agar histori tetap valid
 * untuk keperluan audit tanpa membuat duplikasi tag.
 */
export function appendDeletedTag(name?: string | null): string {
  const clean = String(name || '').trim();
  if (!clean) return DELETED_TAG;
  if (clean.toUpperCase().endsWith(DELETED_TAG.toUpperCase())) return clean;
  return `${clean} ${DELETED_TAG}`;
}

/**
 * Menghapus penanda `[Dihapus]` saat data dipulihkan melalui fitur Undo.
 */
export function stripDeletedTag(name?: string | null): string {
  const clean = String(name || '').trim();
  if (!clean) return '';
  return clean.replace(/\s*\[Dihapus\]$/i, '').trim();
}
