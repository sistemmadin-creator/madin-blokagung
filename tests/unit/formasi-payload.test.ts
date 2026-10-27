import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sanitizeFormasiPayload,
  useFormasiStore,
  ALLOWED_FORMASI_COLUMNS,
} from '@/stores/useFormasiStore';
import { supabase } from '@/lib/supabase/client';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => {
  const updateMock = vi.fn().mockReturnThis();
  const insertMock = vi.fn().mockReturnThis();
  const selectMock = vi.fn().mockReturnThis();
  const eqMock = vi.fn().mockResolvedValue({ error: null, data: null });
  const inMock = vi.fn().mockResolvedValue({ error: null, data: null });
  const orderMock = vi.fn().mockReturnThis();

  return {
    supabase: {
      from: vi.fn(() => ({
        select: selectMock,
        update: updateMock,
        insert: insertMock,
        eq: eqMock,
        in: inMock,
        order: orderMock,
      })),
    },
  };
});

vi.mock('@/lib/utils/audit', () => ({
  logActivity: vi.fn().mockResolvedValue(true),
}));

describe('Formasi Kelas Payload Sanitization & Kelas Unggulan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('1.0 sanitizeFormasiPayload', () => {
    it('harus membuang kolom virtual/computed (_sync, wali_kelas_text, stats)', () => {
      const dirtyData: any = {
        id: 'FK-101',
        tingkat: 'ULA',
        din_kls: '3',
        din_bag: 'b',
        pa_pi: 'PA' as const,
        kapasitas_maksimal: 80,
        is_unggulan: true,
        // Kolom-kolom virtual penyebab error:
        diniyyah_sync: 'Gedung Madin Lt.2',
        takror_sync: 'Musholla Al-Falah',
        domisili_sync: 'Asrama Al-Barokah',
        foto_takror_sync: 'https://img.com/takror.jpg',
        foto_diniyyah_sync: 'https://img.com/diniyyah.jpg',
        wali_kelas_text: 'Ust. Ahmad Dahlan',
        matched_asatidz: [{ nama_asatidz: 'Ust. Ahmad' }] as any,
        jumlah_santri: 75,
        persentase: 94,
        created_at: '2026-01-01T00:00:00Z',
      };

      const clean = sanitizeFormasiPayload(dirtyData);

      // Verifikasi kolom virtual dibuang
      expect(clean).not.toHaveProperty('diniyyah_sync');
      expect(clean).not.toHaveProperty('takror_sync');
      expect(clean).not.toHaveProperty('domisili_sync');
      expect(clean).not.toHaveProperty('foto_takror_sync');
      expect(clean).not.toHaveProperty('foto_diniyyah_sync');
      expect(clean).not.toHaveProperty('wali_kelas_text');
      expect(clean).not.toHaveProperty('matched_asatidz');
      expect(clean).not.toHaveProperty('jumlah_santri');
      expect(clean).not.toHaveProperty('persentase');
      expect(clean).not.toHaveProperty('id');
      expect(clean).not.toHaveProperty('created_at');

      // Verifikasi hanya kolom resmi yang ada
      expect(clean.tingkat).toBe('ULA');
      expect(clean.din_kls).toBe('3');
      expect(clean.din_bag).toBe('B'); // Uppercase
      expect(clean.pa_pi).toBe('PA');
      expect(clean.is_unggulan).toBe(true);
      expect(clean.kapasitas_maksimal).toBe(80);
    });

    it('harus mengonversi is_unggulan ke boolean murni saat diaktifkan atau dinonaktifkan', () => {
      // Kasus dinonaktifkan (false)
      const inactive = sanitizeFormasiPayload({
        tingkat: 'ULA',
        din_kls: '1',
        din_bag: 'A',
        is_unggulan: false,
      });
      expect(inactive.is_unggulan).toBe(false);

      // Kasus diaktifkan (true)
      const active = sanitizeFormasiPayload({
        tingkat: 'ULA',
        din_kls: '1',
        din_bag: 'A',
        is_unggulan: true,
      });
      expect(active.is_unggulan).toBe(true);

      // Kasus undefined / falsy
      const falsy = sanitizeFormasiPayload({
        tingkat: 'ULA',
        din_kls: '1',
        din_bag: 'A',
      });
      expect(falsy.is_unggulan).toBe(false);
    });

    it('semua kunci di hasil sanitasi harus termasuk dalam ALLOWED_FORMASI_COLUMNS', () => {
      const result = sanitizeFormasiPayload({
        tingkat: 'WUSTHO',
        din_kls: '2',
        din_bag: 'c',
        pa_pi: 'PI',
        is_unggulan: true,
        kapasitas_maksimal: 90, // Akan di-clamp ke 80
        id_mustahiq: 'AST-01',
        domisili: 'Asrama Putri',
        lokasi_takror: 'Takror Putri',
        lokasi_diniyyah: 'Diniyyah Putri',
        blok: 'Blok Barat',
        foto_takror: 'data:image/...',
        foto_diniyyah: 'data:image/...',
        // Virtual fields
        diniyyah_sync: 'Should be stripped',
      } as any);

      const allowedSet = new Set(ALLOWED_FORMASI_COLUMNS as readonly string[]);
      for (const key of Object.keys(result)) {
        expect(allowedSet.has(key)).toBe(true);
      }
      expect(result.kapasitas_maksimal).toBe(80); // Max 80
      expect(result.din_bag).toBe('C');
    });
  });

  describe('2.0 saveFormasi Store Method', () => {
    it('mengirim payload bersih (tanpa diniyyah_sync) ke Supabase update', async () => {
      const dirtyEditData: any = {
        id: 'FK-3B-PA',
        tingkat: 'ULA',
        din_kls: '3',
        din_bag: 'B',
        pa_pi: 'PA',
        is_unggulan: false, // User menonaktifkan kelas unggulan
        diniyyah_sync: 'Gedung Madin R.04',
        takror_sync: 'Musholla Induk',
        jumlah_santri: 80,
      };

      const success = await useFormasiStore
        .getState()
        .saveFormasi(dirtyEditData, true, 'FK-3B-PA');

      expect(success).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('formasi_kelas');

      const mockFrom = (supabase.from as any).mock.results[0].value;
      expect(mockFrom.update).toHaveBeenCalled();

      const sentPayload = mockFrom.update.mock.calls[0][0];
      expect(sentPayload).not.toHaveProperty('diniyyah_sync');
      expect(sentPayload).not.toHaveProperty('takror_sync');
      expect(sentPayload).not.toHaveProperty('jumlah_santri');
      expect(sentPayload.is_unggulan).toBe(false);
      expect(sentPayload.din_kls).toBe('3');
      expect(sentPayload.din_bag).toBe('B');
    });
  });

  describe('3.0 toggleUnggulan Store Method', () => {
    it('memperbarui status is_unggulan ke kebalikan status saat ini', async () => {
      const success = await useFormasiStore
        .getState()
        .toggleUnggulan('FK-3B-PA', true);

      expect(success).toBe(true);
      const mockFrom = (supabase.from as any).mock.results[0].value;
      expect(mockFrom.update).toHaveBeenCalledWith({ is_unggulan: false });
    });
  });
});
