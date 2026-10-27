/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase/client';

export interface OfflineMutation {
  id: string;
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT';
  payload: any;
  conflictKey?: string;
  timestamp: string;
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
  errorMsg?: string;
}

const DB_NAME = 'MadinaOfflineDB';
const DB_VERSION = 1;
const STORE_CACHE = 'offline_cache';
const STORE_MUTATIONS = 'mutation_queue';

/**
 * Service Fase 2: Offline-First Caching & Resilient Mutation Queue.
 * Menjamin petugas/asatidz tetap dapat menginput presensi dan hafalan
 * saat jaringan pesantren terputus, dan otomatis disinkronkan saat online.
 */
export class OfflineSyncService {
  private static dbPromise: Promise<IDBDatabase> | null = null;
  private static isSyncing = false;
  private static listeners: Array<(isOnline: boolean, pendingCount: number) => void> = [];

  /**
   * Inisialisasi IndexedDB native browser
   */
  static getDB(): Promise<IDBDatabase> {
    const idb: IDBFactory | undefined =
      typeof window !== 'undefined'
        ? window.indexedDB
        : typeof globalThis !== 'undefined'
          ? (globalThis as any).indexedDB
          : undefined;

    if (!idb) {
      return Promise.reject(new Error('IndexedDB is only available in browser or supported environment'));
    }

    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        const req = idb.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_CACHE)) {
            db.createObjectStore(STORE_CACHE, { keyPath: 'storeKey' });
          }
          if (!db.objectStoreNames.contains(STORE_MUTATIONS)) {
            const mutStore = db.createObjectStore(STORE_MUTATIONS, { keyPath: 'id' });
            mutStore.createIndex('status', 'status', { unique: false });
            mutStore.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    return this.dbPromise;
  }

  /**
   * Menyimpan snapshot data tabel ke IndexedDB offline cache
   */
  static async cacheTableData<T>(table: string, data: T[]): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_CACHE, 'readwrite');
        const store = tx.objectStore(STORE_CACHE);
        store.put({
          storeKey: table,
          data,
          updatedAt: new Date().toISOString(),
        });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Mengambil snapshot data tabel dari cache offline
   */
  static async getCachedTableData<T>(table: string): Promise<T[] | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_CACHE, 'readonly');
        const store = tx.objectStore(STORE_CACHE);
        const req = store.get(table);
        req.onsuccess = () => {
          resolve(req.result ? (req.result.data as T[]) : null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }

  /**
   * Memasukkan mutasi perubahan ke dalam antrean offline (Mutation Queue)
   */
  static async enqueueMutation(
    table: string,
    action: 'INSERT' | 'UPDATE' | 'DELETE' | 'UPSERT',
    payload: any,
    conflictKey?: string
  ): Promise<string> {
    const id = `MUT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const mutation: OfflineMutation = {
      id,
      table,
      action,
      payload,
      conflictKey,
      timestamp: new Date().toISOString(),
      retries: 0,
      status: 'pending',
    };

    try {
      const db = await this.getDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
        const store = tx.objectStore(STORE_MUTATIONS);
        store.put(mutation);
        tx.oncomplete = resolve;
        tx.onerror = reject;
      });

      this.notifyListeners();

      // Jika saat ini online, coba langsung proses
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        this.processSyncQueue();
      }
    } catch (e) {
      console.warn('Gagal enqueue offline mutation:', e);
    }

    return id;
  }

  /**
   * Mengambil seluruh antrean mutasi yang belum tersinkronkan
   */
  static async getPendingMutations(): Promise<OfflineMutation[]> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_MUTATIONS, 'readonly');
        const store = tx.objectStore(STORE_MUTATIONS);
        const req = store.getAll();
        req.onsuccess = () => {
          const all = (req.result || []) as OfflineMutation[];
          resolve(all.filter((m) => m.status === 'pending' || m.status === 'failed'));
        };
        req.onerror = () => resolve([]);
      });
    } catch {
      return [];
    }
  }

  /**
   * Menjalankan sinkronisasi seluruh antrean mutasi ke Supabase
   */
  static async processSyncQueue(): Promise<{ synced: number; failed: number }> {
    if (this.isSyncing) return { synced: 0, failed: 0 };
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return { synced: 0, failed: 0 };
    }

    this.isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
      const pending = await this.getPendingMutations();
      if (pending.length === 0) {
        this.isSyncing = false;
        return { synced: 0, failed: 0 };
      }

      const db = await this.getDB();

      for (const item of pending) {
        try {
          let error = null;

          if (item.action === 'UPSERT') {
            const res = await supabase
              .from(item.table as any)
              .upsert(item.payload, item.conflictKey ? { onConflict: item.conflictKey } : undefined);
            error = res.error;
          } else if (item.action === 'INSERT') {
            const res = await supabase.from(item.table as any).insert(item.payload);
            error = res.error;
          } else if (item.action === 'UPDATE') {
            const res = await supabase
              .from(item.table as any)
              .update(item.payload)
              .match(item.conflictKey ? { [item.conflictKey]: item.payload[item.conflictKey] } : {});
            error = res.error;
          } else if (item.action === 'DELETE') {
            const res = await supabase
              .from(item.table as any)
              .delete()
              .match(item.payload);
            error = res.error;
          }

          if (error) {
            item.retries += 1;
            item.status = item.retries > 3 ? 'failed' : 'pending';
            item.errorMsg = error.message;
            failed += 1;
          } else {
            item.status = 'synced';
            synced += 1;
          }

          // Update status di IndexedDB
          await new Promise((resolve) => {
            const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
            const store = tx.objectStore(STORE_MUTATIONS);
            if (item.status === 'synced') {
              store.delete(item.id);
            } else {
              store.put(item);
            }
            tx.oncomplete = resolve;
          });
        } catch (itemErr: any) {
          failed += 1;
        }
      }
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }

    return { synced, failed };
  }

  /**
   * Menghapus seluruh antrean mutasi
   */
  static async clearQueue(): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_MUTATIONS, 'readwrite');
        const store = tx.objectStore(STORE_MUTATIONS);
        const req = store.clear();
        req.onsuccess = () => {
          this.notifyListeners();
          resolve(true);
        };
        req.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  /**
   * Mendaftarkan listener untuk update status koneksi dan antrean
   */
  static subscribe(fn: (isOnline: boolean, pendingCount: number) => void): () => void {
    this.listeners.push(fn);
    this.notifyListeners();
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private static async notifyListeners() {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const pending = await this.getPendingMutations();
    this.listeners.forEach((fn) => {
      try {
        fn(isOnline, pending.length);
      } catch {}
    });
  }

  /**
   * Mengaktifkan event listener browser online/offline otomatis
   */
  static initAutoSync() {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.notifyListeners();
      this.processSyncQueue();
    });

    window.addEventListener('offline', () => {
      this.notifyListeners();
    });
  }
}
