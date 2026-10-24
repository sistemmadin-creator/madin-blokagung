import { describe, it, expect, beforeEach } from 'vitest';
import { useSantriStore } from '@/stores/useSantriStore';

describe('Santri Store - Unit Tests (Fase 1-5)', () => {
  beforeEach(() => {
    const store = useSantriStore.getState();
    store.clearSelection();
    store.setPage(1);
    store.setPageSize(25);
  });

  describe('Row Selection (Checkbox)', () => {
    it('toggles single row selection accurately', () => {
      const store = useSantriStore.getState();
      expect(store.selectedNoInduk).toHaveLength(0);

      store.toggleSelectRow('10001');
      expect(useSantriStore.getState().selectedNoInduk).toEqual(['10001']);

      store.toggleSelectRow('10002');
      expect(useSantriStore.getState().selectedNoInduk).toEqual(['10001', '10002']);

      store.toggleSelectRow('10001');
      expect(useSantriStore.getState().selectedNoInduk).toEqual(['10002']);
    });

    it('toggles select all for a list of row keys', () => {
      const store = useSantriStore.getState();
      const pageKeys = ['10001', '10002', '10003'];

      // Select all
      store.toggleSelectAll(pageKeys);
      expect(useSantriStore.getState().selectedNoInduk).toEqual(expect.arrayContaining(pageKeys));
      expect(useSantriStore.getState().selectedNoInduk).toHaveLength(3);

      // Deselect all
      store.toggleSelectAll(pageKeys);
      expect(useSantriStore.getState().selectedNoInduk).toHaveLength(0);
    });

    it('clears selection completely', () => {
      const store = useSantriStore.getState();
      store.toggleSelectRow('10001');
      store.toggleSelectRow('10002');
      expect(useSantriStore.getState().selectedNoInduk).toHaveLength(2);

      store.clearSelection();
      expect(useSantriStore.getState().selectedNoInduk).toHaveLength(0);
    });
  });

  describe('Sorting and Page Size', () => {
    it('sets page size and resets page to 1', () => {
      const store = useSantriStore.getState();
      store.setPage(3);
      expect(useSantriStore.getState().page).toBe(3);

      store.setPageSize(50);
      expect(useSantriStore.getState().pageSize).toBe(50);
      expect(useSantriStore.getState().page).toBe(1);
    });

    it('toggles sort direction when clicking same column, defaults to asc for new column', () => {
      const store = useSantriStore.getState();
      // Initial is no_induk asc
      store.setSort('nama');
      expect(useSantriStore.getState().sortKey).toBe('nama');
      expect(useSantriStore.getState().sortDirection).toBe('asc');

      // Click again -> desc
      store.setSort('nama');
      expect(useSantriStore.getState().sortKey).toBe('nama');
      expect(useSantriStore.getState().sortDirection).toBe('desc');

      // Click again -> asc
      store.setSort('nama');
      expect(useSantriStore.getState().sortDirection).toBe('asc');

      // Switch column -> asc
      store.setSort('kamar');
      expect(useSantriStore.getState().sortKey).toBe('kamar');
      expect(useSantriStore.getState().sortDirection).toBe('asc');
    });
  });
});
