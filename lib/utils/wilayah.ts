/* eslint-disable @typescript-eslint/no-explicit-any */
const API_WILAYAH = 'https://www.emsifa.com/api-wilayah-indonesia/api';

const cache = new Map<string, any[]>();

export async function fetchWilayah(path: string): Promise<any[]> {
  if (cache.has(path)) {
    return cache.get(path)!;
  }
  try {
    const res = await fetch(`${API_WILAYAH}/${path}.json`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    cache.set(path, data);
    return data;
  } catch (err) {
    console.error(`Gagal memuat wilayah: ${path}`, err);
    return [];
  }
}

export const getProvinces = () => fetchWilayah('provinces');
export const getRegencies = (provinceId: string) => fetchWilayah(`regencies/${provinceId}`);
export const getDistricts = (regencyId: string) => fetchWilayah(`districts/${regencyId}`);
export const getVillages = (districtId: string) => fetchWilayah(`villages/${districtId}`);
