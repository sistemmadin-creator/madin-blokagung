'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart2,
  Calendar,
  Search,
  RefreshCw,
  Award,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Send,
  MessageCircle,
  Filter,
  UserCheck,
  GraduationCap,
  ChevronRight,
  X,
  ExternalLink,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase/client';
import { EbtadinTahunAjaran, EbtadinSerahIjazah } from '@/types/ebtadin';

interface SantriContact {
  no_induk: string;
  telepon?: string | null;
  nama_ayah?: string | null;
  nama_ibu?: string | null;
}

export default function RekapAngkatanPage() {
  const [activeTab, setActiveTab] = useState<'matriks' | 'audit' | 'cari'>('matriks');
  const [tahunList, setTahunList] = useState<EbtadinTahunAjaran[]>([]);
  const [records, setRecords] = useState<EbtadinSerahIjazah[]>([]);
  const [contacts, setContacts] = useState<Record<string, SantriContact>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Filters for Tab 2 (Audit)
  const [filterAuditTahun, setFilterAuditTahun] = useState<string>('SEMUA');
  const [filterAuditTingkat, setFilterAuditTingkat] = useState<string>('SEMUA');
  const [filterAuditSearch, setFilterAuditSearch] = useState<string>('');

  // Filters for Tab 3 (Pencarian Global)
  const [globalSearch, setGlobalSearch] = useState<string>('');

  // Modals state
  const [waModalData, setWaModalData] = useState<{
    record: EbtadinSerahIjazah;
    phone: string;
    message: string;
  } | null>(null);

  const [serahModalRecord, setSerahModalRecord] = useState<EbtadinSerahIjazah | null>(null);
  const [serahModalTanggal, setSerahModalTanggal] = useState<string>('');
  const [serahModalPenerima, setSerahModalPenerima] = useState<string>('');
  const [serahModalTipe, setSerahModalTipe] = useState<'santri' | 'wali' | 'lainnya'>('santri');
  const [serahModalCatatan, setSerahModalCatatan] = useState<string>('');
  const [isSubmittingSerah, setIsSubmittingSerah] = useState(false);

  // Fetch all cohorts and serah_ijazah data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tahunRes, serahRes, santriRes] = await Promise.all([
        supabase
          .from('ebtadin_tahun_ajaran')
          .select('*')
          .order('tahun_masehi', { ascending: false }),
        supabase
          .from('ebtadin_serah_ijazah')
          .select('*')
          .order('tingkat', { ascending: true })
          .order('din_kls', { ascending: true })
          .order('nama_santri', { ascending: true }),
        supabase
          .from('santri')
          .select('no_induk, telepon, nama_ayah, nama_ibu')
          .limit(3000),
      ]);

      if (tahunRes.data) setTahunList(tahunRes.data as EbtadinTahunAjaran[]);
      if (serahRes.data) setRecords(serahRes.data as EbtadinSerahIjazah[]);

      if (santriRes.data) {
        const contactMap: Record<string, SantriContact> = {};
        santriRes.data.forEach((s: any) => {
          if (s.no_induk) {
            contactMap[s.no_induk] = s;
          }
        });
        setContacts(contactMap);
      }
    } catch (err) {
      console.error('Error fetching rekap angkatan data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Map tahunId to year text
  const tahunMap = useMemo(() => {
    const map = new Map<string, EbtadinTahunAjaran>();
    tahunList.forEach((t) => map.set(t.id, t));
    return map;
  }, [tahunList]);

  // Overall statistics
  const totalPesertaAkumulasi = records.length;
  const totalSudahMenerima = records.filter((r) => r.is_menerima).length;
  const totalBelumMenerima = totalPesertaAkumulasi - totalSudahMenerima;
  const persentaseTotal = totalPesertaAkumulasi > 0
    ? Math.round((totalSudahMenerima / totalPesertaAkumulasi) * 100)
    : 0;

  // Cohort matrix statistics
  const cohortMatrix = useMemo(() => {
    return tahunList.map((th) => {
      const cohortRecords = records.filter((r) => r.tahun_ebtadin_id === th.id);
      const total = cohortRecords.length;
      const sudah = cohortRecords.filter((r) => r.is_menerima).length;
      const belum = total - sudah;
      const pct = total > 0 ? Math.round((sudah / total) * 100) : 0;

      // Last handover date
      const tanggalList = cohortRecords
        .filter((r) => r.tanggal_serah)
        .map((r) => new Date(r.tanggal_serah!).getTime())
        .sort((a, b) => b - a);
      const tanggalTerakhir = tanggalList.length > 0 ? new Date(tanggalList[0]) : null;

      return {
        tahun: th,
        total,
        sudah,
        belum,
        persentase: pct,
        tanggalTerakhir,
      };
    });
  }, [tahunList, records]);

  // Uncollected certificates for Tab 2 (Audit)
  const auditList = useMemo(() => {
    return records.filter((r) => {
      if (r.is_menerima) return false;
      if (filterAuditTahun !== 'SEMUA' && r.tahun_ebtadin_id !== filterAuditTahun) return false;
      if (filterAuditTingkat !== 'SEMUA' && r.tingkat.toUpperCase() !== filterAuditTingkat.toUpperCase()) return false;
      if (filterAuditSearch.trim()) {
        const q = filterAuditSearch.toLowerCase();
        const matchesName = r.nama_santri.toLowerCase().includes(q);
        const matchesNis = r.no_induk.toLowerCase().includes(q);
        const matchesNoIjazah = (r.nomor_seri_ijazah || '').toLowerCase().includes(q);
        const contact = contacts[r.no_induk];
        const matchesWali = (contact?.nama_ayah || contact?.nama_ibu || '').toLowerCase().includes(q);
        if (!matchesName && !matchesNis && !matchesNoIjazah && !matchesWali) return false;
      }
      return true;
    });
  }, [records, filterAuditTahun, filterAuditTingkat, filterAuditSearch, contacts]);

  // Global search results for Tab 3
  const searchResults = useMemo(() => {
    if (!globalSearch.trim()) return [];
    const q = globalSearch.toLowerCase();
    return records.filter((r) => {
      const matchesName = r.nama_santri.toLowerCase().includes(q);
      const matchesNis = r.no_induk.toLowerCase().includes(q);
      const matchesNoIjazah = (r.nomor_seri_ijazah || '').toLowerCase().includes(q);
      return matchesName || matchesNis || matchesNoIjazah;
    });
  }, [records, globalSearch]);

  // Handle Open WA Modal
  const handleOpenWaModal = (record: EbtadinSerahIjazah) => {
    const contact = contacts[record.no_induk];
    const rawPhone = contact?.telepon || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    const th = tahunMap.get(record.tahun_ebtadin_id);
    const tahunText = th ? `${th.tahun_masehi} (${th.tahun_hijriyah} H)` : 'EBTADIN';

    const defaultMsg = `Assalamu'alaikum Wr. Wb.

*Pemberitahuan Pengambilan Ijazah Kelulusan EBTADIN Madin Al-Amiriyyah Blokagung*

Kepada Yth. Wali Santri dari:
• *Nama Santri*: ${record.nama_santri}
• *No. Induk*: ${record.no_induk}
• *Tingkat / Kelas*: ${record.tingkat} ${record.din_kls} ${record.din_bag}
• *Angkatan*: ${tahunText}
• *No. Seri Ijazah*: ${record.nomor_seri_ijazah || 'Tersedia di Sekretariat'}

Kami menginformasikan bahwa ijazah kelulusan santri bersangkutan telah siap diambil di Kantor Sekretariat Madin Al-Amiriyyah Blokagung pada jam kerja dinas.

*Syarat Pengambilan:*
1. Menyelesaikan seluruh tanggungan administrasi & perpustakaan/kitab.
2. Membawa kartu tanda santri/wali atau surat kuasa resmi bila diwakilkan.

Atas perhatian dan kerja samanya kami ucapkan terima kasih.
Wassalamu'alaikum Wr. Wb.

_Pengurus EBTADIN Madin Al-Amiriyyah Blokagung_`;

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

  // Handle Open Quick Handover Modal
  const handleOpenSerahModal = (record: EbtadinSerahIjazah) => {
    setSerahModalRecord(record);
    const today = new Date().toISOString().split('T')[0];
    setSerahModalTanggal(today);
    setSerahModalPenerima(record.nama_santri);
    setSerahModalTipe('santri');
    setSerahModalCatatan('');
  };

  const handleSaveSerahModal = async () => {
    if (!serahModalRecord) return;
    setIsSubmittingSerah(true);
    try {
      const nowIso = serahModalTanggal
        ? new Date(serahModalTanggal).toISOString()
        : new Date().toISOString();
      const penerimaNama = serahModalPenerima.trim() || serahModalRecord.nama_santri;

      const { error } = await supabase
        .from('ebtadin_serah_ijazah')
        .update({
          is_menerima: true,
          tanggal_serah: nowIso,
          penerima_nama: penerimaNama,
          diserahkan_oleh: 'Petugas Sekretariat',
          catatan: serahModalCatatan.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serahModalRecord.id);

      if (error) throw error;

      // Update local state
      setRecords((prev) =>
        prev.map((r) =>
          r.id === serahModalRecord.id
            ? {
                ...r,
                is_menerima: true,
                tanggal_serah: nowIso,
                penerima_nama: penerimaNama,
                diserahkan_oleh: 'Petugas Sekretariat',
                catatan: serahModalCatatan.trim() || null,
              }
            : r
        )
      );
      setSerahModalRecord(null);
    } catch (err) {
      console.error('Gagal mencatat serah ijazah:', err);
      alert('Gagal menyimpan penyerahan ijazah. Silakan coba lagi.');
    } finally {
      setIsSubmittingSerah(false);
    }
  };

  // Export to Excel
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
        'No. Seri Ijazah': r.nomor_seri_ijazah || '-',
        'Status Ijazah': r.is_menerima ? 'Sudah Menerima' : 'Belum Menerima',
        'Tanggal Serah': r.tanggal_serah
          ? new Date(r.tanggal_serah).toLocaleDateString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : '-',
        'Penerima Ijazah': r.penerima_nama || (r.is_menerima ? r.nama_santri : '-'),
        'Diserahkan Oleh': r.diserahkan_oleh || '-',
        'No. Telepon / WA Wali': contact?.telepon || '-',
        'Nama Wali': contact?.nama_ayah || contact?.nama_ibu || '-',
        'Status Penahanan': r.status_penahanan || 'NONE',
        Catatan: r.catatan || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rekap Multi-Angkatan');
    XLSX.writeFile(workbook, `Rekap_Arsip_Ijazah_EBTADIN_${new Date().getFullYear()}.xlsx`);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">
                Rekap &amp; Arsip Angkatan EBTADIN
              </h1>
              <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-800">
                Multi-Angkatan
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Monitoring progres serah ijazah lintas tahun ajaran, audit ijazah mengendap, dan arsip pencarian alumni.
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
            href="/ebtadin/serah-ijazah"
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#0d655e] text-white transition shadow-2xs flex items-center gap-1.5"
          >
            <Award className="w-3.5 h-3.5" />
            <span>Kelola Serah Ijazah</span>
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
              Total Peserta Terdaftar
            </span>
            <div className="text-2xl font-bold text-slate-800 mt-1">
              {totalPesertaAkumulasi} <span className="text-xs font-medium text-slate-500">Santri</span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Akumulasi seluruh angkatan
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-emerald-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 block">
              Ijazah Diserahkan
            </span>
            <div className="text-2xl font-bold text-emerald-700 mt-1">
              {totalSudahMenerima}{' '}
              <span className="text-xs font-semibold text-emerald-800">
                ({persentaseTotal}%)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Telah diterima santri / wali
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-amber-200/80 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 block">
              Ijazah Mengendap
            </span>
            <div className="text-2xl font-bold text-amber-700 mt-1">
              {totalBelumMenerima}{' '}
              <span className="text-xs font-semibold text-amber-800">
                ({100 - persentaseTotal}%)
              </span>
            </div>
            <span className="text-[11px] text-slate-500 mt-0.5 block">
              Menunggu pengambilan
            </span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
            <Clock className="w-5 h-5" />
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
          <BarChart2 className="w-4 h-4 text-emerald-700" />
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
          <Clock className="w-4 h-4 text-amber-600" />
          <span>Audit Ijazah Mengendap</span>
          {totalBelumMenerima > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-amber-100 text-amber-800">
              {totalBelumMenerima}
            </span>
          )}
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
          <span>Pencarian Global Alumni</span>
        </button>
      </div>

      {/* TAB 1: Matriks Lintas Angkatan */}
      {activeTab === 'matriks' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Matriks Progres Serah Ijazah Per Angkatan
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Perbandingan jumlah peserta, capaian distribusi ijazah, dan status tahun ajaran.
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
                  <th className="py-3 px-4 text-center">Sudah Menerima</th>
                  <th className="py-3 px-4 text-center">Belum Menerima</th>
                  <th className="py-3 px-4">Capaian Distribusi</th>
                  <th className="py-3 px-4">Penyerahan Terakhir</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cohortMatrix.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">
                      Belum ada data tahun ajaran EBTADIN yang terdaftar.
                    </td>
                  </tr>
                ) : (
                  cohortMatrix.map((item) => (
                    <tr key={item.tahun.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold">
                            {item.tahun.tahun_masehi}
                          </span>
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
                        {item.sudah}
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-amber-700 text-sm">
                        {item.belum}
                      </td>
                      <td className="py-3.5 px-4 min-w-[160px]">
                        <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                          <span className="text-slate-600">{item.persentase}%</span>
                          <span className="text-slate-400">{item.sudah}/{item.total}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              item.persentase === 100
                                ? 'bg-emerald-600'
                                : item.persentase > 50
                                ? 'bg-[#0f766e]'
                                : 'bg-amber-500'
                            }`}
                            style={{ width: `${item.persentase}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-600">
                        {item.tanggalTerakhir
                          ? item.tanggalTerakhir.toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <Link
                          href={`/ebtadin/serah-ijazah?tahunId=${item.tahun.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition border border-emerald-200"
                        >
                          <span>Buka Serah Ijazah</span>
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

      {/* TAB 2: Audit Ijazah Mengendap */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-bold text-slate-700">Filter Audit:</span>
              </div>

              {/* Filter Tahun */}
              <select
                value={filterAuditTahun}
                onChange={(e) => setFilterAuditTahun(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              >
                <option value="SEMUA">Semua Angkatan</option>
                {tahunList.map((t) => (
                  <option key={t.id} value={t.id}>
                    Angkatan {t.tahun_masehi} ({t.tahun_hijriyah} H)
                  </option>
                ))}
              </select>

              {/* Filter Tingkat */}
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
            </div>

            {/* Pencarian nama / NIS */}
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

          {/* Tabel Ijazah Mengendap */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span>Daftar Ijazah Belum Diambil</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">
                    {auditList.length} Santri
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ijazah yang belum diserahkan ke santri/wali. Hubungi via WhatsApp untuk pengingat pengambilan.
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
                    <th className="py-3 px-4">No. Seri Ijazah</th>
                    <th className="py-3 px-4">Kontak / Wali</th>
                    <th className="py-3 px-4 text-center">Aksi Langsung</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        {records.length === 0
                          ? 'Tidak ada data serah ijazah.'
                          : 'Alhamdulillah, tidak ada ijazah mengendap dengan filter saat ini.'}
                      </td>
                    </tr>
                  ) : (
                    auditList.map((r, idx) => {
                      const th = tahunMap.get(r.tahun_ebtadin_id);
                      const contact = contacts[r.no_induk];
                      const waliName = contact?.nama_ayah || contact?.nama_ibu;
                      return (
                        <tr key={r.id} className="hover:bg-amber-50/30 transition">
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
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                            {r.nomor_seri_ijazah ? (
                              <span className="text-emerald-700 font-semibold">
                                {r.nomor_seri_ijazah}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Belum diinput</span>
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
                              <span className="text-slate-400 italic">Kontak tidak terdaftar</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenWaModal(r)}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition border border-emerald-200 flex items-center gap-1.5"
                                title="Kirim Pesan WhatsApp Pengingat"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Kirim WA</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenSerahModal(r)}
                                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition border border-slate-200 flex items-center gap-1.5"
                                title="Catat Penyerahan Langsung"
                              >
                                <UserCheck className="w-3.5 h-3.5 text-slate-600" />
                                <span>Tandai Serah</span>
                              </button>
                            </div>
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

      {/* TAB 3: Pencarian Global Alumni */}
      {activeTab === 'cari' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <h2 className="text-sm font-bold text-slate-800">
              Pencarian Arsip Ijazah &amp; Alumni Lintas Angkatan
            </h2>
            <p className="text-xs text-slate-500">
              Ketikkan nama santri, NIS / nomor induk, atau nomor seri ijazah untuk memverifikasi riwayat penyerahan ijazah.
            </p>
            <div className="relative max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Contoh: Jordi Onsu, 132.MDN/..., atau IJZ-2026-..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-600 shadow-2xs"
              />
            </div>
          </div>

          {/* Hasil Pencarian */}
          {globalSearch.trim() && (
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700">
                  Ditemukan {searchResults.length} riwayat alumni
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Santri &amp; No. Induk</th>
                      <th className="py-3 px-4">Angkatan</th>
                      <th className="py-3 px-4">Tingkat &amp; Kelas</th>
                      <th className="py-3 px-4">Nomor Seri Ijazah</th>
                      <th className="py-3 px-4">Status Penerimaan</th>
                      <th className="py-3 px-4">Tanggal Serah</th>
                      <th className="py-3 px-4">Nama Penerima</th>
                      <th className="py-3 px-4">Petugas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {searchResults.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 text-center text-slate-400">
                          Tidak ditemukan data ijazah santri dengan kata kunci &quot;{globalSearch}&quot;.
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
                            <td className="py-3 px-4 font-mono text-[11px] text-slate-700">
                              {r.nomor_seri_ijazah || '-'}
                            </td>
                            <td className="py-3 px-4">
                              {r.is_menerima ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Sudah Menerima</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span>Belum Diambil</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-slate-600 text-[11px]">
                              {r.tanggal_serah
                                ? new Date(r.tanggal_serah).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '-'}
                            </td>
                            <td className="py-3 px-4 text-slate-700 font-medium">
                              {r.penerima_nama || (r.is_menerima ? r.nama_santri : '-')}
                            </td>
                            <td className="py-3 px-4 text-slate-500 text-[11px]">
                              {r.diserahkan_oleh || '-'}
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

      {/* MODAL 1: Kirim Pesan Pengingat WhatsApp */}
      {waModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-800">
                  Kirim Pengingat Pengambilan Ijazah (WhatsApp)
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
                    {waModalData.record.din_bag}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Nomor WhatsApp Tujuan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 08123456789 atau 628123456789"
                  value={waModalData.phone}
                  onChange={(e) =>
                    setWaModalData({ ...waModalData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Bisa menggunakan format 08... atau 628...
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Draft Pesan Pemberitahuan
                </label>
                <textarea
                  rows={8}
                  value={waModalData.message}
                  onChange={(e) =>
                    setWaModalData({ ...waModalData, message: e.target.value })
                  }
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

      {/* MODAL 2: Pencatatan Penyerahan Cepat */}
      {serahModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-2xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-800">
                  Tandai Penyerahan Ijazah
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSerahModalRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs">
                <div className="font-bold text-slate-800">{serahModalRecord.nama_santri}</div>
                <div className="text-slate-500 mt-0.5">
                  NIS: {serahModalRecord.no_induk} | {serahModalRecord.tingkat}{' '}
                  {serahModalRecord.din_kls} {serahModalRecord.din_bag}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Tanggal Penyerahan
                </label>
                <input
                  type="date"
                  value={serahModalTanggal}
                  onChange={(e) => setSerahModalTanggal(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Pihak Penerima
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="serahTipe"
                      checked={serahModalTipe === 'santri'}
                      onChange={() => {
                        setSerahModalTipe('santri');
                        setSerahModalPenerima(serahModalRecord.nama_santri);
                      }}
                      className="text-emerald-600"
                    />
                    <span>Santri Sendiri</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="serahTipe"
                      checked={serahModalTipe === 'wali'}
                      onChange={() => {
                        setSerahModalTipe('wali');
                        const contact = contacts[serahModalRecord.no_induk];
                        setSerahModalPenerima(contact?.nama_ayah || contact?.nama_ibu || 'Orang Tua / Wali');
                      }}
                      className="text-emerald-600"
                    />
                    <span>Wali Santri</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="serahTipe"
                      checked={serahModalTipe === 'lainnya'}
                      onChange={() => {
                        setSerahModalTipe('lainnya');
                        setSerahModalPenerima('');
                      }}
                      className="text-emerald-600"
                    />
                    <span>Perwakilan</span>
                  </label>
                </div>
                <input
                  type="text"
                  placeholder="Nama lengkap penerima..."
                  value={serahModalPenerima}
                  onChange={(e) => setSerahModalPenerima(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Catatan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Misal: Diserahkan di kantor madin"
                  value={serahModalCatatan}
                  onChange={(e) => setSerahModalCatatan(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSerahModalRecord(null)}
                disabled={isSubmittingSerah}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/70 rounded-lg transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveSerahModal}
                disabled={isSubmittingSerah}
                className="px-4 py-2 text-xs font-bold text-white bg-[#0f766e] hover:bg-[#0d655e] rounded-lg shadow-2xs transition flex items-center gap-1.5"
              >
                {isSubmittingSerah && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Simpan Penyerahan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
