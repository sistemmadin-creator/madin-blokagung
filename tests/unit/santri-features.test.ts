import { describe, it, expect } from 'vitest';
import {
  DEFAULT_TREE2_RULES,
  parseTree2Options,
  Tree2Rule,
} from '@/lib/services/hierarchy-service';

function getPaginationNumbers(currentPage: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, '...', totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
}

describe('Santri Enhanced Features - Unit Tests', () => {
  describe('Tree 2 (Sekolah Formal Hierarki)', () => {
    it('contains default tree2 rules for SMP and MTs', () => {
      expect(DEFAULT_TREE2_RULES.length).toBeGreaterThan(0);
      const units = new Set(DEFAULT_TREE2_RULES.map((r) => r.unit));
      expect(units.has('SMP Plus Darussalam')).toBe(true);
      expect(units.has('MTs Al Amiriyyah')).toBe(true);
    });

    it('cascades options from unit to jurusan, semester, kelas, and bagian', () => {
      const parsed = parseTree2Options(DEFAULT_TREE2_RULES, 'SMP Plus Darussalam');
      expect(parsed.units).toContain('SMP Plus Darussalam');
      expect(parsed.jurusans).toContain('Tahfidz');
      expect(parsed.jurusans).toContain('Sains');
      expect(parsed.jurusans).toContain('Terpadu');
      expect(parsed.kelases).toEqual(expect.arrayContaining(['VII', 'VIII', 'IX']));
    });

    it('correctly filters jurusans for a selected unit', () => {
      const parsedSMP = parseTree2Options(DEFAULT_TREE2_RULES, 'SMP Plus Darussalam');
      expect(parsedSMP.jurusans).not.toContain('Unggulan MIPA/Sains');

      const parsedMTs = parseTree2Options(DEFAULT_TREE2_RULES, 'MTs Al Amiriyyah');
      expect(parsedMTs.jurusans).toContain('Unggulan MIPA/Sains');
      expect(parsedMTs.jurusans).not.toContain('Tahfidz');
    });

    it('generates alphabetical sections properly (A to E)', () => {
      const parsedMTs = parseTree2Options(
        DEFAULT_TREE2_RULES,
        'MTs Al Amiriyyah',
        'Unggulan MIPA/Sains'
      );
      expect(parsedMTs.bags).toEqual(['A', 'B', 'C', 'D', 'E']);
    });
  });

  describe('Numeric Pagination Generator', () => {
    it('returns simple list when totalPages <= 7', () => {
      expect(getPaginationNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
      expect(getPaginationNumbers(3, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('handles beginning pages with ellipsis at end when totalPages > 7', () => {
      expect(getPaginationNumbers(1, 10)).toEqual([1, 2, 3, 4, 5, '...', 10]);
      expect(getPaginationNumbers(3, 20)).toEqual([1, 2, 3, 4, 5, '...', 20]);
    });

    it('handles middle pages with ellipses on both sides', () => {
      expect(getPaginationNumbers(8, 20)).toEqual([1, '...', 7, 8, 9, '...', 20]);
    });

    it('handles ending pages with ellipsis at beginning', () => {
      expect(getPaginationNumbers(19, 20)).toEqual([1, '...', 16, 17, 18, 19, 20]);
      expect(getPaginationNumbers(20, 20)).toEqual([1, '...', 16, 17, 18, 19, 20]);
    });
  });
});
