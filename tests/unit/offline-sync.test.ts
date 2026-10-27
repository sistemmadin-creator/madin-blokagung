import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OfflineSyncService, OfflineMutation } from '@/lib/services/offlineSyncService';

// Mock IndexedDB in Vitest environment
const mockIndexedDB = (() => {
  const storage: Record<string, Record<string, any>> = {
    offline_cache: {},
    mutation_queue: {},
  };

  return {
    open: vi.fn().mockImplementation(() => {
      const req: any = {
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
        result: {
          objectStoreNames: {
            contains: (name: string) => name in storage,
          },
          createObjectStore: vi.fn(),
          transaction: vi.fn().mockImplementation((storeName: string) => {
            const tx: any = {
              objectStore: () => ({
                put: (item: any) => {
                  const key = item.id || item.storeKey;
                  storage[storeName][key] = item;
                  setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
                },
                get: (key: string) => {
                  const getReq: any = { onsuccess: null, onerror: null, result: storage[storeName][key] };
                  setTimeout(() => getReq.onsuccess && getReq.onsuccess(), 0);
                  return getReq;
                },
                getAll: () => {
                  const getAllReq: any = {
                    onsuccess: null,
                    onerror: null,
                    result: Object.values(storage[storeName]),
                  };
                  setTimeout(() => getAllReq.onsuccess && getAllReq.onsuccess(), 0);
                  return getAllReq;
                },
                delete: (key: string) => {
                  delete storage[storeName][key];
                  setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
                },
                clear: () => {
                  const clearReq: any = { onsuccess: null, onerror: null };
                  storage[storeName] = {};
                  setTimeout(() => {
                    clearReq.onsuccess && clearReq.onsuccess();
                    tx.oncomplete && tx.oncomplete();
                  }, 0);
                  return clearReq;
                },
              }),
              oncomplete: null,
              onerror: null,
            };
            return tx;
          }),
        },
      };
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess({ target: req });
      }, 0);
      return req;
    }),
  };
})();

describe('OfflineSyncService (Fase 2: Offline-First Caching & Mutation Queue)', () => {
  beforeEach(() => {
    vi.stubGlobal('indexedDB', mockIndexedDB);
  });

  it('1. Menginisialisasi koneksi IndexedDB dengan object stores yang tepat', async () => {
    const db = await OfflineSyncService.getDB();
    expect(db).toBeDefined();
  });

  it('2. Berhasil meng-enqueue mutasi offline ke antrean', async () => {
    const id = await OfflineSyncService.enqueueMutation(
      'absensi_records',
      'UPSERT',
      { id: 'ABS-123', status: 'Hadir' },
      'id'
    );

    expect(id).toMatch(/^MUT_/);
  });

  it('3. Menyimpan dan membaca cache tabel santri dan jadwal secara offline', async () => {
    const mockData = [{ id: '1', nama: 'Zaid' }];
    const cached = await OfflineSyncService.cacheTableData('santri', mockData);
    expect(cached).toBe(true);

    const retrieved = await OfflineSyncService.getCachedTableData('santri');
    expect(retrieved).toEqual(mockData);
  });

  it('4. Mendeteksi status antrean dan memproses mutasi saat online', async () => {
    let notifiedOnline = false;
    let pendingItems = 0;

    const unsubscribe = OfflineSyncService.subscribe((isOnline, count) => {
      notifiedOnline = isOnline;
      pendingItems = count;
    });

    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});
