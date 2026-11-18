import { describe, it, expect } from 'vitest';
import { hitungSlotKelasKBM } from '@/lib/utils/jadwalHelper';

function makeSlot(guru = 'Ustadz A', kg = 'A1', fan = 'FIQIH') {
  return [{ guru, kg, fan, lokasi: '-' }];
}

describe('hitungSlotKelasKBM', () => {
  it('mendeteksi kelas dengan slot penuh 12/12 sebagai lengkap', () => {
    const res = hitungSlotKelasKBM({
      jadwal: {
        Sabtu: { 1: makeSlot(), 2: makeSlot() },
        Ahad: { 1: makeSlot(), 2: makeSlot() },
        Senin: { 1: makeSlot(), 2: makeSlot() },
        Selasa: { 1: makeSlot(), 2: makeSlot() },
        Rabu: { 1: makeSlot(), 2: makeSlot() },
        Kamis: { 1: makeSlot(), 2: makeSlot() },
      },
    });
    expect(res).toEqual({ terisi: 12, total: 12, kosong: 0, isIncomplete: false });
  });

  it('mendeteksi kelas dengan slot kurang dari 12 sebagai belum lengkap', () => {
    const res = hitungSlotKelasKBM({
      jadwal: {
        Sabtu: { 1: makeSlot(), 2: [] },
        Ahad: { 1: makeSlot(), 2: makeSlot() },
        Senin: { 1: [], 2: makeSlot() },
        Selasa: { 1: makeSlot(), 2: makeSlot() },
        Rabu: { 1: makeSlot(), 2: makeSlot() },
        Kamis: { 1: makeSlot(), 2: makeSlot() },
      },
    });
    expect(res).toEqual({ terisi: 10, total: 12, kosong: 2, isIncomplete: true });
  });

  it('menghitung kelas kosong total sebagai 0/12', () => {
    const res = hitungSlotKelasKBM({ jadwal: {} });
    expect(res).toEqual({ terisi: 0, total: 12, kosong: 12, isIncomplete: true });
  });
});
