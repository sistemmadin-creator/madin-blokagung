import { describe, it, expect } from 'vitest';
import {
  DEFAULT_HIERARCHY_RULES,
  EMPTY_HIERARCHY_VALUE,
  HierarchyRule,
  parseHierarchyTree,
  extractHierarchyEnums,
  formatKamarDisplay,
} from '@/lib/services/hierarchy-service';

describe('Hierarchy Service - Unit Tests', () => {
  describe('DEFAULT_HIERARCHY_RULES Integrity', () => {
    it('contains exactly 63 default rules matching LPTQ', () => {
      expect(DEFAULT_HIERARCHY_RULES).toHaveLength(63);
    });

    it('covers all 15 expected distinct bloks', () => {
      const bloks = new Set(
        DEFAULT_HIERARCHY_RULES.map((r) => r.parentPath.split('>')[0].trim())
      );
      expect(bloks.size).toBe(15);
      expect(bloks.has('Blok 12')).toBe(true);
      expect(bloks.has('Blok 11')).toBe(true);
      expect(bloks.has('Blok 10')).toBe(true);
      expect(bloks.has('Blok 9')).toBe(true);
      expect(bloks.has('Blok 8')).toBe(true);
      expect(bloks.has('Blok 7')).toBe(true);
      expect(bloks.has('Blok 6')).toBe(true);
      expect(bloks.has('Blok 5')).toBe(true);
      expect(bloks.has('Blok 4')).toBe(true);
      expect(bloks.has('Blok 3')).toBe(true);
      expect(bloks.has('Blok 2')).toBe(true);
      expect(bloks.has('Blok 1')).toBe(true);
      expect(bloks.has('Induk Putri Selatan')).toBe(true);
      expect(bloks.has('Induk Putri Utara')).toBe(true);
      expect(bloks.has('Blok Induk Putra')).toBe(true);
    });

    it('all rules have valid tree, parentPath, and type values', () => {
      DEFAULT_HIERARCHY_RULES.forEach((r) => {
        expect(r.tree).toBe('tree1');
        expect(r.parentPath).toBeTruthy();
        expect(r.parentPath.includes('>')).toBe(true);
        expect(['numeric', 'alpha', 'manual']).toContain(r.type);
      });
    });
  });

  describe('parseHierarchyTree', () => {
    it('correctly expands numeric range and inserts empty default "-"', () => {
      const sampleRules: HierarchyRule[] = [
        {
          id: 'test_1',
          tree: 'tree1',
          parentPath: 'Blok 1 > Al Hikmah > E',
          type: 'numeric',
          numStart: 1,
          numEnd: 3,
        },
      ];

      const tree = parseHierarchyTree(sampleRules);
      expect(tree['Blok 1']).toBeDefined();
      expect(tree['Blok 1']['Al Hikmah']).toBeDefined();
      expect(tree['Blok 1']['Al Hikmah']['E']).toEqual(['-', '1', '2', '3']);
      // Empty code "-" should also be available under the asrama
      expect(tree['Blok 1']['Al Hikmah'][EMPTY_HIERARCHY_VALUE]).toBeDefined();
    });

    it('handles inverted numeric bounds gracefully (numStart > numEnd)', () => {
      const sampleRules: HierarchyRule[] = [
        {
          id: 'test_inv',
          tree: 'tree1',
          parentPath: 'Blok 2 > As Saidiyyah > Q',
          type: 'numeric',
          numStart: 5,
          numEnd: 2,
        },
      ];

      const tree = parseHierarchyTree(sampleRules, { includeEmptyDefault: false });
      expect(tree['Blok 2']['As Saidiyyah']['Q']).toEqual(['2', '3', '4', '5']);
    });

    it('correctly expands alpha range', () => {
      const sampleRules: HierarchyRule[] = [
        {
          id: 'test_alpha',
          tree: 'tree1',
          parentPath: 'Blok 4 > An Nahdloh > AB',
          type: 'alpha',
          alphaStart: 'A',
          alphaEnd: 'D',
        },
      ];

      const tree = parseHierarchyTree(sampleRules, { includeEmptyDefault: false });
      expect(tree['Blok 4']['An Nahdloh']['AB']).toEqual(['A', 'B', 'C', 'D']);
    });

    it('correctly parses manual list of kamar separated by comma', () => {
      const sampleRules: HierarchyRule[] = [
        {
          id: 'test_manual',
          tree: 'tree1',
          parentPath: 'Blok 7 > Al Baqoroh > -',
          type: 'manual',
          manualList: '01, 02, Paviliun, Tamu',
        },
      ];

      const tree = parseHierarchyTree(sampleRules, { includeEmptyDefault: false });
      expect(tree['Blok 7']['Al Baqoroh']['-']).toEqual(['01', '02', 'Paviliun', 'Tamu']);
    });

    it('handles empty or malformed rule array', () => {
      expect(parseHierarchyTree([])).toEqual({});
      // @ts-expect-error test non-array safety
      expect(parseHierarchyTree(null)).toEqual({});
    });
  });

  describe('extractHierarchyEnums', () => {
    it('extracts unique sorted bloks, asramas, kodes, and kamars', () => {
      const sampleRules: HierarchyRule[] = [
        {
          id: 'r1',
          tree: 'tree1',
          parentPath: 'Blok 12 > Maqomin Amin > AB',
          type: 'numeric',
          numStart: 1,
          numEnd: 2,
        },
        {
          id: 'r2',
          tree: 'tree1',
          parentPath: 'Blok 1 > Al Arofah > AA',
          type: 'numeric',
          numStart: 1,
          numEnd: 2,
        },
      ];

      const enums = extractHierarchyEnums(sampleRules);
      expect(enums.bloks).toEqual(['Blok 1', 'Blok 12']);
      expect(enums.asramas).toEqual(['Al Arofah', 'Maqomin Amin']);
      expect(enums.kodes).toContain('AA');
      expect(enums.kodes).toContain('AB');
      expect(enums.kodes[0]).toBe('-');
      expect(enums.kamars[0]).toBe('-');
      expect(enums.combinations).toHaveLength(2);
      expect(enums.routes).toContain('Blok 12 > Maqomin Amin > AB');
      expect(enums.routes).toContain('Blok 1 > Al Arofah > AA');
    });
  });

  describe('formatKamarDisplay', () => {
    it('formats display with kode and kamar', () => {
      expect(formatKamarDisplay('E', '03')).toBe('E03');
      expect(formatKamarDisplay('T', '2')).toBe('T2');
      expect(formatKamarDisplay('MD', '07')).toBe('MD07');
    });

    it('handles "-" as empty gracefully', () => {
      expect(formatKamarDisplay('-', '03')).toBe('03');
      expect(formatKamarDisplay('E', '-')).toBe('E');
      expect(formatKamarDisplay('-', '-')).toBe('-');
      expect(formatKamarDisplay(null, null)).toBe('-');
      expect(formatKamarDisplay('', '')).toBe('-');
    });
  });
});
