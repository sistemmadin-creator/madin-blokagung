'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  GraduationCap,
  Calendar,
  Search,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  Send,
  MessageCircle,
  Filter,
  BarChart2,
  ChevronRight,
  X,
  AlertTriangle,
  TrendingUp,
  Award,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase/client';
import { EbtadinTahunAjaran, EbtadinKelulusan, EbtadinAlasanOption } from '@/types/ebtadin';

interface SantriContact {
  no_induk: string;
  telepon?: string | null;
  nama_ayah?: string | null;
  nama_ibu?: string | null;
}

export default function RekapLulusAngkatanPage() {
  const [activeTab, setActiveTab] = useState<'matriks' | 'audit' | 'analisis' | 'cari'>('matriks');
  const [tahunList, setTahunList] = useState<EbtadinTahunAjaran[]>([]);
  const [records, setRecords] = useState<EbtadinKelulusan[]>([]);
  const [alasanOptions, setAlasanOptions] = useState<EbtadinAlasanOption[]>([]);
  const [contacts, setContacts] = useState<Record<string, SantriContact>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Filters for Audit Tab
  const [filterAuditTahun, setFilterAuditTahun] = useState<string>('SEMUA');
  const [filterAuditTingkat, setFilterAuditTingkat] = useState<string>('SEMUA');
  const [filterAuditAlasan, setFilterAuditAlasan] = useState<string>('SEMUA');
  const [filterAuditSearch, setFilterAuditSearch] = useState<string>('');

  // Global Search Tab
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // WhatsApp Modal
  const [waModalData, setWaModalData] = useState<{
    record: EbtadinKelulusan;
    phone: string;
    message: string;
  } | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tahunRes, lulusRes, alasanRes, santriRes] = await Promise.all([
        supabase
          .from('ebtadin_tahun_ajaran')
          .select('*')
          .order('tahun_masehi', { ascending: false }),
        supabase
          .from('ebtadin_kelulusan')
          .select('*')
          .order('tingkat', { ascending: true })
          .order('din_kls', { ascending: true })
          .order('nama_santri', { ascending: true }),
        supabase
          .from('ebtadin_alasan_options')
          .select('*')
          .eq('kategori', 'LULUS')
          .order('urutan', { ascending: true }),
        supabase
          .from('santri')
          .select('no_induk, telepon, nama_ayah, nama_ibu')
          .limit(3000),
      ]);

      if (tahunRes.data) setTahunList(tahunRes.data as EbtadinTahunAjaran[]);
      if (lulusRes.data) setRecords(lulusRes.data as EbtadinKelulusan[]);
      if (alasanRes.data) setAlasanOptions(alasanRes.data as EbtadinAlasanOption[]);

      if (santriRes.data) {
        const contactMap: Record<string, SantriContact> = {};
        santriRes.data.forEach((s: any) => {
          if (s.no_induk) contactMap[s.no_induk] = s;
        });
        setContacts(contactMap);
      }
    } catch (err) {
      console.error('Error fetching rekap lulus angkatan:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const tahunMap = useMemo(() => {
    const map = new Map<string, EbtadinTahunAjaran>();
    tahunList.forEach((t) => map.set(t.id, t));
    return map;
  }, [tahunList]);

  // Overall Statistics
  const totalPesertaAkumulasi = records.length;
  const totalLulusAkumulasi = records.filter((r) => r.is_lulus).length;
  const totalBelumLulusAkumulasi = totalPesertaAkumulasi - totalLulusAkumulasi;
  const persentaseTotal = totalPesertaAkumulasi > 0
    ? Math.round((totalLulusAkumulasi / totalPesertaAkumulasi) * 100)
    : 0;

  // Cohort Matrix
  const cohortMatrix = useMemo(() => {
    return tahunList.map((th) => {
      const cohortRecords = records.filter((r) => r.tahun_ebtadin_id === th.id);
      const total = cohortRecords.length;
      const lulus = cohortRecords.filter((r) => r.is_lulus).length;
      const belumLulus = total - lulus;
      const pct = total > 0 ? Math.round((lulus / total) * 100) : 0;

      return {
        tahun: th,
        total,
        lulus,
        belumLulus,
        persentase: pct,
      };
    });
  }, [tahunList, records]);

  // Ranking Alasan Belum Lulus Lintas Angkatan
  const rankingAlasanGlobal = useMemo(() => {
    const counts: Record<string, { label: string; count: number; kode: string }> = {};

    alasanOptions.forEach((opt) => {
      counts[opt.kode] = { label: opt.label, count: 0, kode: opt.kode };
    });

    records.forEach((r) => {
      if (!r.is_lulus) {
        const kode = r.alasan_kode || 'LAINNYA';
        const label = r.alasan_teks || 'Alasan Khusus Lainnya';
        if (!counts[kode]) counts[kode] = { label, count: 0, kode };
        counts[kode].count += 1;
      }
    });

    const list = Object.values(counts).sort((a, b) => b.count - a.count);
    const withCount = list.filter((item) => item.count > 0);
    const terbanyak = withCount.length > 0 ? withCount[0] : null;
    const tersedikit = withCount.length > 1 ? withCount[withCount.length - 1] : null;

    return { list, terbanyak, tersedikit, totalBelumLulus: totalBelumLulusAkumulasi };
  }, [records, alasanOptions, totalBelumLulusAkumulasi]);

  // Audit List
  const auditList = useMemo(() => {
    return records.filter((r) => {
      if (r.is_lulus) return false;
      if (filterAuditTahun !== 'SEMUA' && r.tahun_ebtadin_id !== filterAuditTahun) return false;
      if (filterAuditTingkat !== 'SEMUA' && r.tingkat.toUpperCase() !== filterAuditTingkat.toUpperCase()) return false;
      if (filterAuditAlasan !== 'SEMUA' && r.alasan_kode !== filterAuditAlasan) return false;
      if (filterAuditSearch.trim()) {
        const q = filterAuditSearch.toLowerCase();
        const matchesName = r.nama_santri.toLowerCase().includes(q);
        const matchesNis = r.no_induk.toLowerCase().includes(q);
        const contact = contacts[r.no_induk];
        const matchesWali = (contact?.nama_ayah || contact?.nama_ibu || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNis && !matchesWali) return false;
      }
      return true;
    });
  }, [records, filterAuditTahun, filterAuditTingkat, filterAuditAlasan, filterAuditSearch, contacts]);

  // Global Search
  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const q = globalSearch.toLowerCase();
    return records.filter((r) => {
      const matchesName = r.nama_santri.toLowerCase().includes(q);
      const matchesNis = r.no_induk.toLowerCase().includes(q);
      const matchesAlasan = (r.alasan_teks || '').toLowerCase().includes(q);
      const matchesPredikat = (r.predikat || '').toLowerCase().includes(q);
      return matchesName || matchesNis || matchesAlasan || matchesPredikat;
    });
  }, [records, globalSearch]);

  // WA Modal
  const handleOpenWaModal = (record: EbtadinKelulusan) => {
    const contact = contacts[record.no_induk];
    const rawPhone = contact?.telepon || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const th = tahunMap.get(record.tahun_ebtadin_id);
    const tahunText = th ? `${th.tahun_masehi} (${th.tahun_hijriyah} H)` : 'EBTADIN';

    const defaultMsg = `Assalamu'alaikum Wr. Wb.

*Pemberitahuan Status Kelulusan & Program Remidi EBTADIN Madin Al-Amiriyyah Blokagung*

Kepada Yth. Wali Santri dari:
• *Nama Santri*: ${record.nama_santri}
• *No. Induk*: ${record.no_induk}
• *Tingkat / Kelas*: ${record.tingkat} ${record.din_kls} ${record.din_bag}
• *Angkatan*: ${tahunText}
• *Status Kelulusan*: Ditunda / Belum Memenuhi Syarat
• *Keterangan Alasan*: ${record.alasan_teks || 'Tuntasan Hafalan / Nilai Ujian Belum Tercapai'}

Kami menginformasikan bahwa santri bersangkutan masih memiliki tanggungan akademik/hafalan yang harus dituntaskan agar ijazah kelulusan EBTADIN dapat diterbitkan resmi oleh madrasah.

Mohon berkoordinasi dengan Mustahiq Kelas / Panitia EBTADIN untuk bimbingan perbaikan dan jadwal penyelesaian tanggungan tersebut.

Wassalamu'alaikum Wr. Wb.
_Panitia Kelulusan EBTADIN Madin Al-Amiriyyah Blokagung_`;

    setWaModalData({
      record,
      phone: cleanPhone,
      message: defaultMsg,
    });
  };

  const handleSendWa = () => {
    if (!waModalData) return;
    let targetPhone = waModalData.phone.replace(/\D/g, '');
    if (targetPhone.startsWith('0')) {
      targetPhone = '62' + targetPhone.slice(1);
    }
    const encoded = encodeURIComponent(waModalData.message);
    const waUrl = targetPhone
      ? `https://wa.me/${targetPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
    setWaModalData(null);
  };

  // Export Excel
  const handleExportFullExcel = () => {
    if (records.length === 0) return;
    const data = records.map((r, idx) => {
      const th = tahunMap.get(r.tahun_ebtadin_id);
      const contact = contacts[r.no_induk];
      return {
        No: idx + 1,
        'Tahun Angkatan': th ? `${th.tahun_masehi} (${th.tahun_hijriyah} H)` : '-',
        'No. Induk': r.no_induk,
        'Nama Santri': r.nama_santri,
        Tingkat: r.tingkat,
        Kelas: `${r.din_kls} ${r.din_bag}`,
        'Status Kelulusan': r.is_lulus ? 'Lulus' : 'Belum Lulus / Ditunda',
        'Alasan Penundaan': r.is_lulus ? '-' : r.alasan_teks || '-',
        Predikat: r.predikat || '-',
        Catatan: r.catatan || '-',
        'No. Telepon / WA Wali': contact?.telepon || '-',
        'Nama Wali': contact?.nama_ayah || contact?.nama_ibu || '-',
        'Ditetapkan Oleh': r.ditetapkan_oleh || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Lulus Multi-Angkatan');
    XLSX.writeFile(workbook, `Rekap_Kelulusan_EBTADIN_Multi_Angkatan_${new Date().getFullYear()}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-[#0f766e] border border-emerald-100">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Rekap &amp; Arsip Lulus Angkatan
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-800">
                Multi-Angkatan
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Matriks perbandingan kelulusan santri antar angkatan, audit santri ditunda, dan pemetaan faktor kelulusan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={fetchData}
            disabled={isLoading}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          <button
            type="button"
            onClick={handleExportFullExcel}
            disabled={records.length === 0}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Ekspor Excel Rekap</span>
          </button>
          <Link
            href="/ebtadin/kelulusan"
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#0d655e] text-white transition shadow-2xs flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Kelola Rekap Lulus</span>
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* 4 Kartu Metrik Ringkasan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Total Angkatan
            </span>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {tahunList.length} <span className="text-xs font-medium text-slate-500">Angkatan</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              {tahunList.filter((t) => t.is_active).length} Tahun Ajaran Aktif
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 text-slate-600 border border-slate-100">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block">
              Akumulasi Peserta
            </span>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {totalPesertaAkumulasi} <span className="text-xs font-medium text-slate-500">Santri</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Total terdaftar seluruh angkatan
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <Award className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-emerald-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 block">
              Total Lulus EBTADIN
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {totalLulusAkumulasi}{' '}
              <span className="text-xs font-semibold text-emerald-800">
                ({persentaseTotal}%)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Memenuhi seluruh kriteria kelulusan
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-rose-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 block">
              Belum Lulus / Ditunda
            </span>
            <div className="text-2xl font-bold text-rose-700 mt-1">
              {totalBelumLulusAkumulasi}{' '}
              <span className="text-xs font-semibold text-rose-800">
                ({100 - persentaseTotal}%)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Tanggungan hafalan / remidi ujian
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Navigasi Tab */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('matriks')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'matriks'
              ? 'bg-white text-slate-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart2 className="w-4 h-4 text-[#0f766e]" />
          <span>Matriks Lintas Angkatan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'audit'
              ? 'bg-white text-slate-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <XCircle className="w-4 h-4 text-rose-600" />
          <span>Audit Ditunda / Belum Lulus</span>
          {totalBelumLulusAkumulasi > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-100 text-rose-800">
              {totalBelumLulusAkumulasi}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('analisis')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'analisis'
              ? 'bg-white text-slate-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-amber-600" />
          <span>Peringkat Alasan</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('cari')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition flex items-center gap-2 ${
            activeTab === 'cari'
              ? 'bg-white text-slate-800 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Search className="w-4 h-4 text-slate-700" />
          <span>Pencarian Santri / Alumni</span>
        </button>
      </div>

      {/* TAB 1: Matriks Lintas Angkatan */}
      {activeTab === 'matriks' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Matriks Kelulusan Santri Per Angkatan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan jumlah peserta, tingkat kelulusan (passing rate), dan status arsip tahunan.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Tahun Ajaran / Angkatan</th>
                  <th className="py-3 px-4">Status Angkatan</th>
                  <th className="py-3 px-4 text-center">Total Peserta</th>
                  <th className="py-3 px-4 text-center">Lulus</th>
                  <th className="py-3 px-4 text-center">Belum Lulus</th>
                  <th className="py-3 px-4">Tingkat Kelulusan</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cohortMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Belum ada data tahun ajaran EBTADIN yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  cohortMatrix.map((item) => (
                    <tr key={item.tahun.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">{item.tahun.tahun_masehi}</span>
                          <span className="text-xs text-slate-500 font-normal">
                            ({item.tahun.tahun_hijriyah} H)
                          </span>
                          {item.tahun.is_active && (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-sm bg-emerald-100 text-emerald-800 uppercase">
                              Aktif
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                          {item.tahun.nama_angkatan || 'Angkatan EBTADIN'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            item.tahun.status === 'LOCKED'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.tahun.status === 'LOCKED' ? 'Terkunci (Arsip)' : 'Aktif (Berjalan)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-800 text-sm">
                        {item.total}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-700 text-sm">
                        {item.lulus}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-rose-700 text-sm">
                        {item.belumLulus}
                      </td>
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-600">{item.persentase}%</span>
                          <span className="text-slate-400">{item.lulus}/{item.total}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              item.persentase >= 90
                                ? 'bg-emerald-600'
                                : item.persentase >= 75
                                ? 'bg-[#0f766e]'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${item.persentase}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/ebtadin/kelulusan?tahunId=${item.tahun.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition border border-emerald-200"
                        >
                          <span>Buka Rekap Lulus</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Audit Ditunda / Belum Lulus */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Filter Audit:</span>
              </div>

              <select
                value={filterAuditTahun}
                onChange={(e) => setFilterAuditTahun(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="SEMUA">Semua Angkatan</option>
                {tahunList.map((t) => (
                  <option key={t.id} value={t.id}>
                    Angkatan {t.tahun_masehi}
                  </option>
                ))}
              </select>

              <select
                value={filterAuditTingkat}
                onChange={(e) => setFilterAuditTingkat(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="SEMUA">Semua Tingkat</option>
                <option value="ULA">Tingkat ULA</option>
                <option value="WUSTHO">Tingkat WUSTHO</option>
                <option value="ULYA">Tingkat ULYA</option>
              </select>

              <select
                value={filterAuditAlasan}
                onChange={(e) => setFilterAuditAlasan(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="SEMUA">Semua Alasan</option>
                {alasanOptions.map((o) => (
                  <option key={o.id} value={o.kode}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full md:w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari santri, NIS, wali..."
                value={filterAuditSearch}
                onChange={(e) => setFilterAuditSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
          </div>

          {/* Tabel Audit Santri Belum Lulus */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>Daftar Santri Ditunda Kelulusannya</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800">
                    {auditList.length} Santri
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Santri yang belum dinyatakan lulus. Kirim pesan WA untuk pemberitahuan remidi / tuntasan hafalan.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4">Santri &amp; No. Induk</th>
                    <th className="py-3 px-4">Angkatan</th>
                    <th className="py-3 px-4">Kelas / Rombel</th>
                    <th className="py-3 px-4">Alasan Penundaan</th>
                    <th className="py-3 px-4">Kontak / Wali</th>
                    <th className="py-3 px-4 text-center">Aksi Konfirmasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        Alhamdulillah, seluruh santri telah memenuhi kriteria kelulusan dengan filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    auditList.map((r, idx) => {
                      const th = tahunMap.get(r.tahun_ebtadin_id);
                      const contact = contacts[r.no_induk];
                      const waliName = contact?.nama_ayah || contact?.nama_ibu;
                      return (
                        <tr key={r.id} className="hover:bg-rose-50/30 transition">
                          <td className="py-3 px-4 text-center font-medium text-slate-400">
                            {idx + 1}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{r.nama_santri}</div>
                            <div className="text-[11px] font-mono text-slate-500">
                              NIS: {r.no_induk}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            {th ? `${th.tahun_masehi}` : '-'}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">
                            <span className="px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 font-mono text-[11px]">
                              {r.tingkat} {r.din_kls} {r.din_bag}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[11px]">
                              {r.alasan_teks || 'Belum Lulus'}
                            </span>
                            {r.catatan && (
                              <p className="text-[10px] text-slate-500 mt-1 italic">
                                &quot;{r.catatan}&quot;
                              </p>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {waliName ? (
                              <div>
                                <div className="text-slate-800 font-medium">{waliName}</div>
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {contact?.telepon || 'No. Telp belum ada'}
                                </div>
                              </div>
                            ) : contact?.telepon ? (
                              <div className="font-mono text-slate-700">{contact.telepon}</div>
                            ) : (
                              <span className="text-slate-400 italic">Kontak belum ada</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenWaModal(r)}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition border border-emerald-200 inline-flex items-center gap-1.5"
                              title="Kirim Pemberitahuan Remidi via WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Kirim WA</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Analisis Peringkat Alasan */}
      {activeTab === 'analisis' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <h2 className="text-sm font-bold text-slate-800">
              Analisis Faktor Penyebab Ketidaklulusan (Akumulasi Lintas Angkatan)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pemetaan faktor penundaan kelulusan yang paling sering terjadi sebagai bahan evaluasi kurikulum dan program bimbingan santri.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/50">
                <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider block">
                  Penyebab Paling Sering (Faktor Terbanyak)
                </span>
                <div className="text-xl font-bold text-rose-900 mt-1">
                  {rankingAlasanGlobal.terbanyak
                    ? `${rankingAlasanGlobal.terbanyak.label} (${rankingAlasanGlobal.terbanyak.count} Kasus)`
                    : 'Seluruh santri lulus'}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Penyebab Paling Jarang (Faktor Tersedikit)
                </span>
                <div className="text-xl font-bold text-slate-800 mt-1">
                  {rankingAlasanGlobal.tersedikit
                    ? `${rankingAlasanGlobal.tersedikit.label} (${rankingAlasanGlobal.tersedikit.count} Kasus)`
                    : rankingAlasanGlobal.terbanyak
                    ? `${rankingAlasanGlobal.terbanyak.label} (${rankingAlasanGlobal.terbanyak.count} Kasus)`
                    : 'Seluruh santri lulus'}
                </div>
              </div>
            </div>

            {/* Tabel Peringkat */}
            <div className="mt-5 border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">Rank</th>
                    <th className="py-2.5 px-4">Kategori Alasan Penundaan</th>
                    <th className="py-2.5 px-4 text-center">Jumlah Kasus</th>
                    <th className="py-2.5 px-4">Persentase &amp; Distribusi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rankingAlasanGlobal.list.map((item, idx) => {
                    const pct =
                      totalBelumLulusAkumulasi > 0
                        ? Math.round((item.count / totalBelumLulusAkumulasi) * 100)
                        : 0;
                    return (
                      <tr key={item.kode} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-4 text-center font-bold text-slate-600">
                          #{idx + 1}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {item.label}
                        </td>
                        <td className="py-2.5 px-4 text-center font-bold text-[#0f766e]">
                          {item.count} Santri
                        </td>
                        <td className="py-2.5 px-4 min-w-[200px]">
                          <div className="flex items-center justify-between text-[11px] mb-1">
                            <span className="font-semibold text-slate-600">{pct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-[#0f766e] h-full rounded-full transition-all duration-300"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Pencarian Global Alumni */}
      {activeTab === 'cari' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-800">
              Pencarian Riwayat Kelulusan Santri &amp; Alumni
            </h2>
            <p className="text-xs text-slate-500">
              Ketikkan nama santri, NIS, nomor ijazah, atau alasan penundaan untuk memverifikasi keabsahan kelulusan.
            </p>
            <div className="relative max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Contoh: Basuki, 12590, IJZ-2026, atau Hafalan..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
              />
            </div>
          </div>

          {globalSearch.trim() && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Ditemukan {searchResults.length} riwayat santri
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Santri &amp; No. Induk</th>
                      <th className="py-3 px-4">Angkatan</th>
                      <th className="py-3 px-4">Tingkat &amp; Kelas</th>
                      <th className="py-3 px-4">Status Kelulusan</th>
                      <th className="py-3 px-4">Predikat / Nilai</th>
                      <th className="py-3 px-4">Keterangan / Alasan</th>
                      <th className="py-3 px-4">Ditetapkan Oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {searchResults.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">
                          Tidak ditemukan data kelulusan santri dengan kata kunci &quot;{globalSearch}&quot;.
                        </td>
                      </tr>
                    ) : (
                      searchResults.map((r) => {
                        const th = tahunMap.get(r.tahun_ebtadin_id);
                        return (
                          <tr key={r.id} className="hover:bg-slate-50/70 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800">{r.nama_santri}</div>
                              <div className="text-[11px] font-mono text-slate-500">
                                NIS: {r.no_induk}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800">
                              {th ? `${th.tahun_masehi}` : '-'}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-700">
                              {r.tingkat} {r.din_kls} {r.din_bag}
                            </td>
                            <td className="py-3 px-4">
                              {r.is_lulus ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Lulus Munaqosyah</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  <span>Ditunda / Remidi</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-semibold text-[11px] text-slate-700">
                              {r.predikat || '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-600 text-[11px]">
                              {r.is_lulus ? '-' : r.alasan_teks || 'Tidak ada keterangan'}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {r.ditetapkan_oleh || '-'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal WhatsApp Pengingat Remidi */}
      {waModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-800">
                  Konfirmasi Remidi / Tuntasan (WhatsApp)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWaModalData(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Santri Bersangkutan
                </label>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800">
                    {waModalData.record.nama_santri} ({waModalData.record.no_induk})
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    Kelas: {waModalData.record.tingkat} {waModalData.record.din_kls}{' '}
                    {waModalData.record.din_bag} | Alasan: {waModalData.record.alasan_teks || 'Ditunda'}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nomor WhatsApp Wali
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  value={waModalData.phone}
                  onChange={(e) => setWaModalData({ ...waModalData, phone: e.target.value })}
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Draft Pesan Pemberitahuan
                </label>
                <textarea
                  rows={8}
                  value={waModalData.message}
                  onChange={(e) => setWaModalData({ ...waModalData, message: e.target.value })}
                  className="w-full p-3 text-xs font-sans rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setWaModalData(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSendWa}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Buka di WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
