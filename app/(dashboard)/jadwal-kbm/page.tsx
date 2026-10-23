'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useJadwalStore, LIST_HARI, HariKbm } from '@/stores/useJadwalStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFanStore } from '@/stores/useFanStore';
import { Calendar, RefreshCw, AlertTriangle, Search, Save } from 'lucide-react';
import Dialog from '@/components/ui/Dialog';

export default function JadwalKbmPage() {
  const { jadwalMap, fetchJadwal, isLoading, updateJadwalSlot, deleteJadwalSlot } = useJadwalStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { fanItems, fetchFanData } = useFanStore();

  const [activeHariTab, setActiveHariTab] = useState<HariKbm>('Sabtu');
  const [searchKelas, setSearchKelas] = useState('');
  const [selectedCell, setSelectedCell] = useState<{
    hari: HariKbm;
    jam: 1 | 2 | 3 | 4;
    kelas: string;
    currentFan: string;
    currentAsatidz: string;
  } | null>(null);

  const [editFan, setEditFan] = useState('');
  const [editAsatidz, setEditAsatidz] = useState('');

  useEffect(() => {
    fetchJadwal();
    if (formasiList.length === 0) fetchFormasi();
    if (asatidzList.length === 0) fetchAsatidz();
    if (fanItems.length === 0) fetchFanData();
  }, [fetchJadwal, fetchFormasi, fetchAsatidz, fetchFanData, formasiList.length, asatidzList.length, fanItems.length]);

  // Build list of distinct classes from formasi
  const classList = useMemo(() => {
    const list = formasiList.map((f) => `${f.tingkat} ${f.din_kls}${f.din_bag} (${f.pa_pi})`);
    return Array.from(new Set(list)).sort();
  }, [formasiList]);

  // Extract matrix map: { "Hari_Jam_Kelas": { fan, asatidz } }
  // Also detect conflicts: { "Hari_Jam_Teacher": count }
  const { slotMatrix, teacherConflictMap } = useMemo(() => {
    const matrix: Record<string, { fan: string; asatidz: string }> = {};
    const conflictCounter: Record<string, number> = {};

    Object.values(jadwalMap).forEach((teacherRow) => {
      const teacherName = teacherRow.nama_asatidz;

      LIST_HARI.forEach((hari) => {
        const hariKey = hari.toLowerCase() as 'sabtu' | 'ahad' | 'senin' | 'selasa' | 'rabu' | 'kamis';
        const dayStr = teacherRow[hariKey] || '';
        if (!dayStr) return;

        const lines = dayStr.split(';;').map((s) => s.trim()).filter(Boolean);
        lines.forEach((l) => {
          const parts = l.split('|').map((s) => s.trim());
          const jamNum = parseInt((parts[0] || '').replace(/\D/g, ''), 10) as 1 | 2 | 3 | 4;
          const kelas = parts[1] || '';
          const fan = parts[2] || '';

          if (jamNum && kelas) {
            const cellKey = `${hari}_${jamNum}_${kelas}`;
            matrix[cellKey] = { fan, asatidz: teacherName };

            // Count for conflict
            const conflictKey = `${hari}_${jamNum}_${teacherName.toUpperCase()}`;
            conflictCounter[conflictKey] = (conflictCounter[conflictKey] || 0) + 1;
          }
        });
      });
    });

    return { slotMatrix: matrix, teacherConflictMap: conflictCounter };
  }, [jadwalMap]);

  const handleCellClick = (hari: HariKbm, jam: 1 | 2 | 3 | 4, kelas: string) => {
    const cellKey = `${hari}_${jam}_${kelas}`;
    const current = slotMatrix[cellKey] || { fan: '', asatidz: '' };
    setSelectedCell({
      hari,
      jam,
      kelas,
      currentFan: current.fan,
      currentAsatidz: current.asatidz,
    });
    setEditFan(current.fan);
    setEditAsatidz(current.asatidz);
  };

  const handleSaveCell = async () => {
    if (!selectedCell) return;
    await updateJadwalSlot(
      selectedCell.hari,
      selectedCell.jam,
      selectedCell.kelas,
      editFan,
      editAsatidz
    );
    setSelectedCell(null);
  };

  const handleDeleteCell = async () => {
    if (!selectedCell) return;
    await deleteJadwalSlot(selectedCell.hari, selectedCell.jam, selectedCell.kelas);
    setSelectedCell(null);
  };

  const filteredClassList = classList.filter((c) =>
    !searchKelas || c.toLowerCase().includes(searchKelas.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Halaman Jadwal KBM */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-madin-50 text-madin-700 flex items-center justify-center shadow-xs">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Jadwal KBM Per Kelas</h1>
            <p className="text-xs text-slate-500">
              Matriks Slot Mengajar 6 Hari (Sabtu s.d. Kamis) x 4 Jam Pelajaran
            </p>
          </div>
        </div>

        <button
          onClick={fetchJadwal}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Muat Ulang Jadwal</span>
        </button>
      </div>

      {/* Tabs Pilihan Hari (Sabtu - Kamis) & Pencarian Kelas */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {LIST_HARI.map((hari) => (
            <button
              key={hari}
              onClick={() => setActiveHariTab(hari)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition whitespace-nowrap ${
                activeHariTab === hari
                  ? 'bg-madin-700 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              Hari {hari}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchKelas}
            onChange={(e) => setSearchKelas(e.target.value)}
            placeholder="Filter nama kelas..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-madin-600"
          />
        </div>
      </div>

      {/* Matriks Jadwal KBM Grid */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto max-h-[650px] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 text-slate-700 font-bold z-10 select-none">
              <tr>
                <th className="p-3 w-48 bg-slate-100 border-r border-slate-200 sticky left-0 z-20">
                  Rombel / Kelas
                </th>
                {[1, 2, 3, 4].map((j) => (
                  <th key={j} className="p-3 text-center border-r border-slate-200 min-w-[220px]">
                    <div className="font-bold text-slate-800">Jam Ke-{j}</div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {j <= 2 ? 'Madin Sore (MS)' : 'Madin Malam (MB)'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClassList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    Belum ada rombel kelas yang terdaftar. Buat formasi rombel kelas terlebih dahulu di menu Formasi Kelas.
                  </td>
                </tr>
              ) : (
                filteredClassList.map((kelasName) => (
                  <tr key={kelasName} className="hover:bg-slate-50/50 transition">
                    <td className="p-3 font-bold text-slate-800 bg-slate-50/80 border-r border-slate-200 sticky left-0 z-10 whitespace-nowrap">
                      {kelasName}
                    </td>

                    {[1, 2, 3, 4].map((jam) => {
                      const cellKey = `${activeHariTab}_${jam}_${kelasName}`;
                      const slot = slotMatrix[cellKey];
                      const teacherUpper = slot?.asatidz ? slot.asatidz.toUpperCase() : '';
                      const conflictKey = `${activeHariTab}_${jam}_${teacherUpper}`;
                      const isConflict = slot?.asatidz && (teacherConflictMap[conflictKey] || 0) > 1;

                      return (
                        <td
                          key={jam}
                          onClick={() => handleCellClick(activeHariTab, jam as 1 | 2 | 3 | 4, kelasName)}
                          className={`p-2.5 border-r border-slate-100 cursor-pointer transition hover:bg-emerald-50/30 ${
                            isConflict ? 'bg-rose-50/70 border-rose-300' : ''
                          }`}
                          title="Klik untuk mengubah Fan & Guru Pengampu"
                        >
                          {slot?.fan ? (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-madin-800 bg-madin-50 px-2 py-0.5 rounded text-[11px] border border-madin-200">
                                  {slot.fan}
                                </span>
                                {isConflict && (
                                  <span
                                    className="flex items-center gap-0.5 text-[10px] font-bold text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded"
                                    title="Bentrok: Guru ini mengajar di kelas lain pada jam yang sama!"
                                  >
                                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                                    Bentrok
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] font-semibold text-slate-700 truncate">
                                {slot.asatidz || 'Tanpa Guru'}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center py-2 text-slate-300 hover:text-slate-500 text-[11px]">
                              + Kosong
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Sel Jadwal */}
      {selectedCell && (
        <Dialog
          isOpen={true}
          onClose={() => setSelectedCell(null)}
          title={`Edit Jadwal: ${selectedCell.kelas} - Hari ${selectedCell.hari} Jam Ke-${selectedCell.jam}`}
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Fan Pelajaran</label>
              <input
                list="listFanKbm"
                value={editFan}
                onChange={(e) => setEditFan(e.target.value.toUpperCase())}
                placeholder="Pilih atau ketik Fan..."
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 uppercase font-bold focus:outline-none focus:ring-1 focus:ring-madin-600"
              />
              <datalist id="listFanKbm">
                {fanItems.map((f) => (
                  <option key={f.id} value={f.nama}>
                    {f.nama} ({f.kitab})
                  </option>
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dewan Asatidz Pengampu</label>
              <input
                list="listAsatidzKbm"
                value={editAsatidz}
                onChange={(e) => setEditAsatidz(e.target.value)}
                placeholder="Pilih atau ketik nama ustadz..."
                className="w-full text-xs py-2 px-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-madin-600 font-medium"
              />
              <datalist id="listAsatidzKbm">
                {asatidzList.map((a) => (
                  <option key={a.nia} value={a.nama_asatidz}>
                    {a.nia} - {a.nama_asatidz} ({a.jah_asatidz || 'Asatidz'})
                  </option>
                ))}
              </datalist>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDeleteCell}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100"
              >
                Kosongkan Slot
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveCell}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-madin-700 hover:bg-madin-800 text-white shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Slot</span>
                </button>
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
