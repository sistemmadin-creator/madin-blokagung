'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Grid,
  History,
  Search,
  Trash2,
} from 'lucide-react';
import { SetoranHafalan } from '@/types/setoran';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { formatTanggalResmi, norm } from '@/lib/utils/setoranHelper';
import { DeleteImpactAnalysis } from '@/lib/services/relationDeleteTypes';
import KonfirmasiHapusRelasiModal from '@/components/ui/KonfirmasiHapusRelasiModal';
import ModalDetailRiwayatSetoran from '@/components/modules/setoran/ModalDetailRiwayatSetoran';
import KartuBuktiSetoran, { KartuData } from '@/components/modules/setoran/KartuBuktiSetoran';

interface TabelRiwayatHafalanViewProps {
  setoranList: SetoranHafalan[];
  santriList: any[];
  canDelete: boolean;
  isPersonAllowed: (person: { blok?: string; pa_pi?: string }) => boolean;
  onDeleteSetoran: (key: {
    noInduk: string;
    tglSetor: string;
    hafalan: string;
  }) => Promise<boolean>;
  onBulkDeleteSetoran: (noIndukList: string[]) => Promise<boolean>;
}

function buildKartuDataFromRecord(record: SetoranHafalan | null): KartuData {
  if (!record) {
    return {
      nama: '',
      bin: '',
      nis: '',
      ttl: '',
      mustahiq: '',
      kelas: '',
      kec: '',
      kab: '',
      prov: '',
      penjaga: '',
      hafalan: '',
      tglSetor: '',
    };
  }

  const ttlParts: string[] = [];
  if (record.tempat_lahir) ttlParts.push(record.tempat_lahir);
  const tglGabung = [record.tgl_lahir, record.bln_lahir, record.thn_lahir]
    .filter(Boolean)
    .join(' ');
  if (tglGabung) ttlParts.push(tglGabung);

  const kelasParts = [record.din_kls, record.din_bag, record.tingkat].filter(Boolean);

  return {
    nama: record.nama || '',
    bin: record.bin || '',
    nis: record.no_induk || '',
    ttl: ttlParts.join(', '),
    mustahiq: record.mustahiq || '',
    kelas: kelasParts.length > 0 ? kelasParts.join(' - ') : record.kelas || '',
    kec: record.kecamatan || '',
    kab: record.kabupaten || '',
    prov: record.provinsi || '',
    penjaga: record.penjaga || '',
    hafalan: record.item_hafalan || '',
    tglSetor: formatTanggalResmi(record.tanggal),
  };
}

export default function TabelRiwayatHafalanView({
  setoranList,
  santriList,
  canDelete,
  isPersonAllowed,
  onDeleteSetoran,
  onBulkDeleteSetoran,
}: TabelRiwayatHafalanViewProps) {
  const router = useRouter();
  const { setEditingRecord } = useMuhafadzohStore();

  const [filterGender, setFilterGender] = useState<'SEMUA' | 'PA' | 'PI'>('SEMUA');
  const [searchHistory, setSearchHistory] = useState('');
  const [selectedIndukList, setSelectedIndukList] = useState<string[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [deleteAnalysis, setDeleteAnalysis] = useState<DeleteImpactAnalysis | null>(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSetoranForDetail, setSelectedSetoranForDetail] =
    useState<SetoranHafalan | null>(null);
  const [printTargetRecord, setPrintTargetRecord] = useState<SetoranHafalan | null>(null);

  const filteredHistory = useMemo(() => {
    return setoranList.filter((s) => {
      const found = santriList.find(
        (item: any) => String(item.no_induk || item[1]).trim() === String(s.no_induk).trim()
      );
      if (found && !isPersonAllowed({ blok: found.blok, pa_pi: found.pa_pi })) return false;
      if (filterGender !== 'SEMUA') {
        if (found && norm(found.pa_pi || (found as any)[4]) !== filterGender) return false;
      }
      if (searchHistory.trim()) {
        const q = searchHistory.toLowerCase().trim();
        return (
          (s.nama || '').toLowerCase().includes(q) ||
          (s.no_induk || '').toLowerCase().includes(q) ||
          (s.item_hafalan || '').toLowerCase().includes(q) ||
          (s.penjaga || '').toLowerCase().includes(q) ||
          (s.mustahiq || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [setoranList, santriList, isPersonAllowed, filterGender, searchHistory]);

  const handleSelectAllRows = (checked: boolean) => {
    if (checked) {
      const allIds = filteredHistory.map((s) => String(s.no_induk).trim());
      setSelectedIndukList(Array.from(new Set(allIds)));
    } else {
      setSelectedIndukList([]);
    }
  };

  const handleRowCheckboxToggle = (induk: string, checked: boolean) => {
    const clean = String(induk).trim();
    if (checked) {
      if (!selectedIndukList.includes(clean)) {
        setSelectedIndukList([...selectedIndukList, clean]);
      }
    } else {
      setSelectedIndukList(selectedIndukList.filter((id) => id !== clean));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIndukList.length === 0) {
      alert('Centang minimal satu data riwayat setoran terlebih dahulu!');
      return;
    }
    const targetSet = new Set(selectedIndukList.map((n) => String(n).trim()));
    const matchedRows = setoranList.filter((r) =>
      targetSet.has(String(r.no_induk || '').trim())
    );
    const summaryMap = new Map<string, { code: string; name: string; count: number }>();

    selectedIndukList.forEach((nis) => {
      const cleanNis = String(nis).trim();
      const sample = matchedRows.find((r) => String(r.no_induk || '').trim() === cleanNis);
      const count = matchedRows.filter(
        (r) => String(r.no_induk || '').trim() === cleanNis
      ).length;
      summaryMap.set(cleanNis, {
        code: cleanNis,
        name: sample?.nama || `Santri NIS ${cleanNis}`,
        count,
      });
    });

    setDeleteAnalysis({
      items: Array.from(summaryMap.values()).map((s) => ({
        code: s.code,
        name: s.name,
        meta: `${s.count} catatan setoran`,
      })),
      impacts: [
        `Sebanyak ${matchedRows.length} catatan riwayat setoran Muhafadzoh dari ${selectedIndukList.length} santri akan dihapus dari tabel riwayat.`,
        'Sinkronisasi otomatis ke tabel relasional setoran_hafalan_records dan RIWAYAT_MUHAFADZOH_DATA.',
      ],
      activeWarnings: [
        `Penghapusan ${matchedRows.length} riwayat hafalan ini dapat memengaruhi kalkulasi ketercapaian hafalan santri terpilih (dapat dipulihkan melalui fitur Undo).`,
      ],
      activeWarningTitle: 'Terdeteksi Riwayat Setoran Aktif',
      activeRiskCheckboxLabel:
        'Saya mengerti risikonya dan tetap ingin menghapus seluruh riwayat setoran santri terpilih di atas.',
      safeArchiveNote:
        'Data biodata induk santri di Database Santri tetap aman dan tidak ikut terhapus.',
      hasHistoricalRecords: false,
    });
    setIsDeleteModalOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    setIsDeletingBulk(true);
    const success = await onBulkDeleteSetoran(selectedIndukList);
    setIsDeletingBulk(false);
    if (success) {
      setSelectedIndukList([]);
      setIsDeleteModalOpen(false);
    }
  };

  const handleEditFromDetail = (record: SetoranHafalan) => {
    setEditingRecord(record, {
      noInduk: record.no_induk,
      tglSetor: record.tanggal,
      hafalan: record.item_hafalan,
    });
    router.push('/setoran');
  };

  const handlePrintFromDetail = (record: SetoranHafalan) => {
    setPrintTargetRecord(record);
    setDetailModalOpen(false);
    setTimeout(() => {
      document.body.classList.add('printing-kartu-setoran');
      setTimeout(() => {
        window.print();
        setTimeout(() => {
          document.body.classList.remove('printing-kartu-setoran');
        }, 600);
      }, 150);
    }, 150);
  };

  const handleDeleteFromDetail = async (record: SetoranHafalan) => {
    if (
      !confirm(
        `Hapus setoran hafalan ${record.item_hafalan} (${record.nama}) tanggal ${record.tanggal}?`
      )
    ) {
      return;
    }
    const success = await onDeleteSetoran({
      noInduk: record.no_induk,
      tglSetor: record.tanggal,
      hafalan: record.item_hafalan,
    });
    if (success) {
      setDetailModalOpen(false);
      alert('Data setoran berhasil dihapus.');
    }
  };

  const kartuData = useMemo(
    () => buildKartuDataFromRecord(printTargetRecord),
    [printTargetRecord]
  );

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="card-panel border-0 no-print-kbm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3.5">
            <div className="w-[50px] h-[50px] rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-center flex-shrink-0">
              <History className="w-6 h-6 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 m-0 leading-tight">
                Tabel Riwayat Hafalan{' '}
                <span className="text-slate-400 font-normal text-lg">(Setoran)</span>
              </h2>
              <p className="text-slate-500 text-xs m-0 mt-0.5">
                Daftar seluruh riwayat setoran hafalan santri Madrasah Diniyyah Al Amiriyyah.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-2xs">
            <Link
              href="/setoran"
              data-testid="btn-kembali-setoran"
              className="min-h-[34px] px-3 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-200 hover:border-emerald-200 text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Setoran</span>
            </Link>

            <div className="w-px h-6 bg-slate-200 mx-0.5 hidden sm:block" />

            <div className="px-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5 leading-none">
                Filter Gender
              </label>
              <select
                aria-label="Filter Gender Riwayat"
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value as 'SEMUA' | 'PA' | 'PI')}
                className="text-xs font-semibold text-slate-700 bg-slate-50 border-0 rounded px-2 py-1 focus:outline-none"
              >
                <option value="SEMUA">Semua</option>
                <option value="PA">Putra (PA)</option>
                <option value="PI">Putri (PI)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Kotak Tabel Riwayat Hafalan (11 Kolom) */}
      <div className="card-panel border-0 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Grid className="w-4 h-4" />
            </div>
            <div>
              <h5 className="font-bold text-slate-800 text-sm m-0">Tabel Riwayat Hafalan</h5>
              <p className="text-[11px] text-slate-500 m-0">
                Menampilkan {filteredHistory.length} catatan setoran
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canDelete && selectedIndukList.length > 0 && (
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 transition flex items-center gap-1.5 cursor-pointer"
                title="Hapus Terpilih"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Terpilih ({selectedIndukList.length})</span>
              </button>
            )}

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchHistory}
                onChange={(e) => setSearchHistory(e.target.value)}
                placeholder="Pencarian..."
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:border-emerald-600 bg-white"
              />
            </div>
          </div>
        </div>

        <div className="table-responsive overflow-x-auto">
          <table className="tabel-kbm-resmi w-full text-xs">
            <thead>
              <tr>
                <th style={{ width: 40 }} className="text-center">
                  <input
                    type="checkbox"
                    aria-label="Pilih semua baris"
                    checked={
                      filteredHistory.length > 0 &&
                      selectedIndukList.length >= filteredHistory.length
                    }
                    onChange={(e) => handleSelectAllRows(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                <th style={{ width: 40 }} className="text-center">
                  NO
                </th>
                <th style={{ width: 90 }}>NIS</th>
                <th style={{ width: 130 }}>TGL SETOR</th>
                <th style={{ minWidth: 160 }}>NAMA SANTRI</th>
                <th style={{ minWidth: 150 }}>TEMPAT, TGL LAHIR</th>
                <th style={{ minWidth: 130 }}>PENJAGA</th>
                <th style={{ minWidth: 130 }}>ASATIDZ</th>
                <th style={{ width: 100 }}>KELAS</th>
                <th style={{ minWidth: 150 }}>HAFALAN</th>
                <th style={{ width: 100 }} className="text-center">
                  KATEGORI
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-slate-400 italic">
                    Belum ada data riwayat setoran hafalan.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((row, idx) => {
                  const sInduk = String(row.no_induk).trim();
                  const isChecked = selectedIndukList.includes(sInduk);

                  const ttlGabung = [
                    row.tempat_lahir,
                    [row.tgl_lahir, row.bln_lahir, row.thn_lahir].filter(Boolean).join(' '),
                  ]
                    .filter(Boolean)
                    .join(', ');

                  const klsGabung =
                    row.kelas ||
                    `${row.din_kls || ''} ${row.din_bag || ''} ${row.tingkat || ''}`.trim() ||
                    '-';

                  return (
                    <tr
                      key={row.id || `${sInduk}_${row.tanggal}_${idx}`}
                      onClick={() => {
                        setSelectedSetoranForDetail(row);
                        setDetailModalOpen(true);
                      }}
                      className="hover:bg-slate-50 transition cursor-pointer select-none"
                    >
                      <td className="text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Pilih ${row.nama}`}
                          checked={isChecked}
                          onChange={(e) => handleRowCheckboxToggle(sInduk, e.target.checked)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                      </td>
                      <td className="text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="font-mono text-slate-600">{row.no_induk}</td>
                      <td className="text-slate-700 whitespace-nowrap">{row.tanggal}</td>
                      <td className="font-bold text-slate-900">{row.nama}</td>
                      <td className="text-slate-600">{ttlGabung || '-'}</td>
                      <td className="text-slate-700">{row.penjaga || '-'}</td>
                      <td className="text-slate-700">{row.mustahiq || '-'}</td>
                      <td className="text-slate-600 font-medium">{klsGabung}</td>
                      <td className="text-emerald-700 font-bold">{row.item_hafalan}</td>
                      <td className="text-center">
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {row.kategori || 'Wajib'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Area Cetak Kartu Tersembunyi untuk mendukung Print dari Modal Detail */}
      <div
        id="print-area"
        aria-hidden="true"
        className="fixed -left-[9999px] top-0 pointer-events-none"
      >
        <KartuBuktiSetoran data={kartuData} />
      </div>

      <KonfirmasiHapusRelasiModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Konfirmasi Hapus Data Terpilih"
        analysis={deleteAnalysis}
        isDeleting={isDeletingBulk}
        onConfirm={handleConfirmBulkDelete}
      />

      <ModalDetailRiwayatSetoran
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        clickedSetoran={selectedSetoranForDetail}
        allSetoranList={setoranList}
        onEdit={handleEditFromDetail}
        onPrint={handlePrintFromDetail}
        onDelete={handleDeleteFromDetail}
      />
    </div>
  );
}
