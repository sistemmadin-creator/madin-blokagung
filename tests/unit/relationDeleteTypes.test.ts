import { describe, it, expect } from 'vitest';
import { appendDeletedTag, stripDeletedTag } from '@/lib/services/relationDeleteTypes';

describe('relationDeleteTypes helpers', () => {
  it('menambahkan label [Dihapus] secara bersih tanpa duplikasi', () => {
    expect(appendDeletedTag('Ahmad Fauzi')).toBe('Ahmad Fauzi [Dihapus]');
    expect(appendDeletedTag('  Ahmad Fauzi  ')).toBe('Ahmad Fauzi [Dihapus]');
    expect(appendDeletedTag('Ahmad Fauzi [Dihapus]')).toBe('Ahmad Fauzi [Dihapus]');
    expect(appendDeletedTag('Ahmad Fauzi [dihapus]')).toBe('Ahmad Fauzi [dihapus]');
    expect(appendDeletedTag('')).toBe('[Dihapus]');
    expect(appendDeletedTag(null)).toBe('[Dihapus]');
  });

  it('menghapus label [Dihapus] saat pemulihan Undo', () => {
    expect(stripDeletedTag('Ahmad Fauzi [Dihapus]')).toBe('Ahmad Fauzi');
    expect(stripDeletedTag('Ahmad Fauzi [dihapus]')).toBe('Ahmad Fauzi');
    expect(stripDeletedTag('Ahmad Fauzi')).toBe('Ahmad Fauzi');
    expect(stripDeletedTag('')).toBe('');
  });
});
