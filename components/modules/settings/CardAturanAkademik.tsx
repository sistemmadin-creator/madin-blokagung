'use client';

import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { useAbsensiStore } from '@/stores/useAbsensiStore';
import { KATEGORI_LIBUR_OPTIONS } from '@/lib/utils/absensiHelper';
import { HariLiburInfo } from '@/types/absensi';

const HARI_LIST = ['Sabtu', 'Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;

export default function CardAturanAkademik() {
  const { liburMapByDate, setHariLibur, fetchAbsensi } = useAbsensiStore();

  // Hari Aktif Belajar
  const [activeDays, setActiveDays] = useState<string[]>([
    'Sabtu',
    'Ahad',
    'Senin',
    'Selasa',
    'Rabu',
    'Kamis',
  ]);

  // Jam Sesi KBM
  const [jamMalamStart, setJamMalamStart] = useState('19:30');
  const [jamMalamEnd, setJamMalamEnd] = useState('21:30');
  const [jamSoreStart, setJamSoreStart] = useState('15:45');
  const [jamSoreEnd, setJamSoreEnd] = useState('17:00');

  // Toleransi Keterlambatan
  const [toleransiMenit, setToleransiMenit] = useState(15);
  const [batasBadalMenit, setBatasBadalMenit] = useState(45);

  // Form Tambah Libur Khusus
  const [tglLibur, setTglLibur] = useState('');
  const [kategoriLibur, setKategoriLibur] = useState<string>(KATEGORI_LIBUR_OPTIONS[0]);
  const [keteranganLibur, setKeteranganLibur] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    fetchAbsensi();
  }, [fetchAbsensi]);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleToggleDay = (hari: string) => {
    if (hari === 'Jumat') {
      showNotification('Hari Jumat merupakan hari libur mingguan tetap pondok pesantren.');
      return;
    }
    setActiveDays((prev) =>
      prev.includes(hari) ? prev.filter((d) => d !== hari) : [...prev, hari]
    );
  };

  const handleAddLibur = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tglLibur) {
      alert('Pilih tanggal libur terlebih dahulu.');
      return;
    }

    const payload: HariLiburInfo = {
      tanggal: tglLibur,
      kategori: kategoriLibur,
      keterangan: keteranganLibur || kategoriLibur,
      waktuUpdate: new Date().toISOString(),
    };

    await setHariLibur(tglLibur, payload);
    showNotification(`Hari libur pada tanggal ${tglLibur} berhasil didaftarkan!`);
    setTglLibur('');
    setKeteranganLibur('');
  };

  const handleDeleteLibur = async (tgl: string) => {
    if (confirm(`Hapus status libur untuk tanggal ${tgl}?`)) {
      await setHariLibur(tgl, null);
      showNotification(`Tanggal libur ${tgl} berhasil dihapus.`);
    }
  };

  const handleSaveOperationalRules = () => {
    showNotification('Aturan operasional KBM, jam sesi, dan toleransi berhasil diperbarui!');
  };

  const liburEntries = Object.entries(liburMapByDate || {}).sort(([a], [b]) => b.localeCompare(a));

  return (
    <div data-testid="card-aturan-akademik" className="space-y-6">
      {/* Banner Notifikasi */}
      {notification && (
        <div className="p-3.5 bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-md animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-amber-300 flex-shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Bagian 1: Hari Aktif KBM & Toleransi Waktu */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 text-cyan-800 text-xs font-semibold mb-2 border border-cyan-200">
            <Clock className="w-3.5 h-3.5 text-cyan-600" />
            <span>Jadwal Operasional Pendidikan</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Aturan Hari Aktif &amp; Sesi Pembelajaran KBM
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tentukan hari operasional madrasah, jam masuk per sesi pengajian kitab, dan batas dispensasi keterlambatan asatidz.
          </p>
        </div>

        {/* Pilihan Hari Aktif */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            Hari Aktif Belajar Santri &amp; Asatidz
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
            {HARI_LIST.map((hari) => {
              const isActive = activeDays.includes(hari);
              const isJumat = hari === 'Jumat';
              return (
                <button
                  key={hari}
                  type="button"
                  data-testid={`btn-day-${hari.toLowerCase()}`}
                  onClick={() => handleToggleDay(hari)}
                  className={`p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                    isJumat
                      ? 'bg-rose-50 border-rose-200 text-rose-700 opacity-90 cursor-not-allowed'
                      : isActive
                      ? 'bg-emerald-800 text-white border-emerald-900 shadow-sm'
                      : 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>{hari}</div>
                  <div className="text-[10px] font-normal mt-0.5">
                    {isJumat ? 'Libur Pondok' : isActive ? 'Aktif KBM' : 'Libur'}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Pengaturan Jam Sesi */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Sesi Malam */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Sesi Utama (Malam Ba&apos;da Isya)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                Wajib Semua Kelas
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1">Mulai Masuk</label>
                <input
                  type="time"
                  data-testid="input-jam-malam-start"
                  value={jamMalamStart}
                  onChange={(e) => setJamMalamStart(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1">Selesai Belajar</label>
                <input
                  type="time"
                  data-testid="input-jam-malam-end"
                  value={jamMalamEnd}
                  onChange={(e) => setJamMalamEnd(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Sesi Sore */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800">Sesi Khusus (Sore Ba&apos;da Ashar)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                Sorogan &amp; Nadzom
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1">Mulai Masuk</label>
                <input
                  type="time"
                  data-testid="input-jam-sore-start"
                  value={jamSoreStart}
                  onChange={(e) => setJamSoreStart(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 font-medium block mb-1">Selesai Belajar</label>
                <input
                  type="time"
                  data-testid="input-jam-sore-end"
                  value={jamSoreEnd}
                  onChange={(e) => setJamSoreEnd(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white font-semibold text-slate-800"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Toleransi Keterlambatan */}
        <div className="p-4 rounded-xl border border-cyan-100 bg-cyan-50/40 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-cyan-700 flex-shrink-0" />
            <span className="text-xs font-bold text-cyan-900">
              Kebijakan Toleransi Presensi Asatidz
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-[11px] text-cyan-800 font-medium block mb-1">
                Batas Dispensasi Telat (Menit)
              </label>
              <input
                type="number"
                data-testid="input-toleransi-menit"
                value={toleransiMenit}
                onChange={(e) => setToleransiMenit(Number(e.target.value))}
                min={0}
                max={60}
                className="w-full px-3 py-1.5 rounded-lg border border-cyan-200 bg-white font-semibold text-slate-800"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Presensi &gt; {toleransiMenit} menit otomatis tercatat sebagai &quot;Terlambat&quot;.
              </span>
            </div>

            <div>
              <label className="text-[11px] text-cyan-800 font-medium block mb-1">
                Batas Panggilan Guru Badal (Menit)
              </label>
              <input
                type="number"
                data-testid="input-batas-badal-menit"
                value={batasBadalMenit}
                onChange={(e) => setBatasBadalMenit(Number(e.target.value))}
                min={15}
                max={90}
                className="w-full px-3 py-1.5 rounded-lg border border-cyan-200 bg-white font-semibold text-slate-800"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                Jika &gt; {batasBadalMenit} menit belum hadir, kelas dialihkan ke Guru Badal.
              </span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            data-testid="btn-save-operational-rules"
            onClick={handleSaveOperationalRules}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Aturan Operasional KBM</span>
          </button>
        </div>
      </div>

      {/* Bagian 2: Manajemen Kalender Hari Libur Madin */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-semibold mb-2 border border-amber-200">
            <Calendar className="w-3.5 h-3.5 text-amber-600" />
            <span>Kalender Pendidikan Pesantren</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            Manajemen Hari Libur &amp; Event Khusus Madin
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Daftarkan hari libur pondok, ikhtibar/ujian cawu, atau agenda ma&apos;had agar presensi KBM dinonaktifkan otomatis.
          </p>
        </div>

        {/* Form Tambah Libur */}
        <form
          onSubmit={handleAddLibur}
          className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3"
        >
          <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-700" />
            <span>Daftarkan Tanggal Libur Baru</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="text-[11px] text-slate-500 font-medium block mb-1">
                Tanggal Libur
              </label>
              <input
                type="date"
                data-testid="input-tgl-libur"
                value={tglLibur}
                onChange={(e) => setTglLibur(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
                required
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-500 font-medium block mb-1">
                Kategori Libur
              </label>
              <select
                data-testid="select-kategori-libur"
                value={kategoriLibur}
                onChange={(e) => setKategoriLibur(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
              >
                {KATEGORI_LIBUR_OPTIONS.map((kat) => (
                  <option key={kat} value={kat}>
                    {kat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] text-slate-500 font-medium block mb-1">
                Keterangan / Alasan
              </label>
              <input
                type="text"
                data-testid="input-keterangan-libur"
                placeholder="Misal: Libur Maulid Nabi SAW"
                value={keteranganLibur}
                onChange={(e) => setKeteranganLibur(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-medium text-slate-800"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              data-testid="btn-add-libur"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambahkan ke Kalender</span>
            </button>
          </div>
        </form>

        {/* Tabel Daftar Hari Libur Terdaftar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700">
              Daftar Hari Libur Terdaftar ({liburEntries.length} Tanggal)
            </span>
            <span className="text-slate-400">Tersinkron dengan presensi asatidz</span>
          </div>

          {liburEntries.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              Belum ada tanggal libur khusus yang didaftarkan. Gunakan formulir di atas untuk menambahkan.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
              {liburEntries.map(([tgl, info]) => {
                const liburInfo = info as HariLiburInfo;
                return (
                  <div
                    key={tgl}
                    data-testid={`row-libur-${tgl}`}
                    className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-bold">
                        {tgl}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-slate-800 block">
                          {liburInfo.kategori}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {liburInfo.keterangan || '-'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      data-testid={`btn-delete-libur-${tgl}`}
                      onClick={() => handleDeleteLibur(tgl)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Hapus Tanggal Libur"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
