import { describe, it, expect } from 'vitest';

describe('Muhafadzoh Calculation & Targets', () => {
  const DEFAULT_TARGETS: Record<string, number> = {
    "Ro'sun Sirah": 100,
    'Hidayatus Shibyan': 40,
    Alfiyyah: 1000,
    Imrithi: 254,
  };

  function isKhatam(namaNadhom: string, totalBait: number): boolean {
    const target = DEFAULT_TARGETS[namaNadhom] || 100;
    return totalBait >= target;
  }

  function calculateClassProgress(santriList: { nis: string; totalBait: number }[], targetPerSantri: number): number {
    if (santriList.length === 0) return 0;
    const totalTarget = santriList.length * targetPerSantri;
    const currentTotal = santriList.reduce((acc, s) => acc + Math.min(s.totalBait, targetPerSantri), 0);
    return Math.round((currentTotal / totalTarget) * 100);
  }

  it('determines khatam status based on target bait count', () => {
    expect(isKhatam('Hidayatus Shibyan', 39)).toBe(false);
    expect(isKhatam('Hidayatus Shibyan', 40)).toBe(true);
    expect(isKhatam('Hidayatus Shibyan', 45)).toBe(true);

    expect(isKhatam('Imrithi', 253)).toBe(false);
    expect(isKhatam('Imrithi', 254)).toBe(true);

    expect(isKhatam('Alfiyyah', 999)).toBe(false);
    expect(isKhatam('Alfiyyah', 1000)).toBe(true);
  });

  it('computes class progress percentage accurately', () => {
    const santriRombel = [
      { nis: '1', totalBait: 100 },
      { nis: '2', totalBait: 100 },
      { nis: '3', totalBait: 50 },
      { nis: '4', totalBait: 50 },
    ];
    // Total target = 4 * 100 = 400. Current = 100+100+50+50 = 300. Progress = 75%
    expect(calculateClassProgress(santriRombel, 100)).toBe(75);
  });
});
