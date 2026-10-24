'use client';

import React, { useState, useRef } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { supabase } from '@/lib/supabase/client';
import { logActivity } from '@/lib/utils/audit';
import * as XLSX from 'xlsx';
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
} from 'lucide-react';

function getExcelColumnValue(rowObj: Record<string, unknown>, aliases: string[]): string {
  const keys = Object.keys(rowObj || {});
  for (const alias of aliases) {
    const target = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    const foundKey = keys.find(
      (k) => k.toLowerCase().replace(/[^a-z0-9]/g, '') === target
    );
    if (foundKey !== undefined && rowObj[foundKey] !== null && rowObj[foundKey] !== undefined) {
      return String(rowObj[foundKey]).trim();
    }
  }
  return '';
}

export default function ModalImportExcelAsatidz() {
  const { isImportModalOpen, closeImportModal, fetchAsatidz } = useAsatidzStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setIsProcessing(false);
    setProgressMsg('');
    setErrorMsg(null);
    setSuccessCount(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isProcessing) return;
    resetState();
    closeImportModal();
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'NIS',
      'NIA',
      'Nama Lengkap',
      'PA/PI',
      'Tingkat',
      'Din. Kls',
      'Din. Bag',
      'Jah',
      'Lokasi Diniyyah',
      'Lokasi Takror',
      'Tempat Lahir',
      'Tgl Lahir',
      'Bln Lahir',
      'Thn Lahir',
      'Dusun',
      'Desa',
      'Kecamatan',
      'Kabupaten',
      'Provinsi',
      'Blok',
      'Asrama',
      'Kode',
      'Kamar',
    ];

    const contohBaris1 = [
      '201901',
      'A1',
      'UST. AHMAD FAUZI',
      'PA',
      'ULA',
      '1',
      'A',
      'Mustahiq',
      'Gedung Al-Falah R.01',
      'Masjid Lt. 1',
      'BANYUWANGI',
      '12',
      '05',
      '1998',
      'Krajan',
      'Karangdoro',
      'Tegalsari',
      'Banyuwangi',
      'Jawa Timur',
      'Induk',
      'Al-Falah',
      'A',
      '01',
    ];

    const contohBaris2 = [
      '202015',
      'B1',
      'USTZ. SITI AISYAH',
      'PI',
      'WUSTHO',
      '1',
      'A',
      'Mustahiqoh',
      'Gedung Al-Munawwaroh R.02',
      'Aula Putri',
      'JEMBER',
      '24',
      '08',
      '2000',
      'Sumberjati',
      'Kalisat',
      'Kalisat',
      'Jember',
      'Jawa Timur',
      'Putri',
      'Al-Munawwaroh',
      'B',
      '03',
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, contohBaris1, contohBaris2]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 5, 14) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Asatidz');
    XLSX.writeFile(wb, 'Template_Import_Data_Asatidz.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg(null);
      setSuccessCount(null);
    }
  };

  const handleProsesImport = async () => {
    if (!selectedFile) {
      setErrorMsg('Silakan pilih file Excel terlebih dahulu.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setProgressMsg('Membaca berkas Excel...');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: '' });

      if (!jsonRows || jsonRows.length === 0) {
        throw new Error('File Excel kosong atau format tidak dapat dibaca.');
      }

      setProgressMsg(`Memvalidasi ${jsonRows.length} baris data...`);

      const recordsToInsert: Record<string, unknown>[] = [];

      jsonRows.forEach((row) => {
        const nama = getExcelColumnValue(row, [
          'nama_asatidz',
          'Nama Lengkap',
          'Nama Lengkap Asatidz',
          'Nama Asatidz',
          'Asatidz',
          'Nama',
        ]).toUpperCase();

        if (!nama) return;

        let papi = getExcelColumnValue(row, ['pa_pi', 'PA/PI', 'Gender', 'JK', 'L/P']).toUpperCase();
        if (papi === 'L' || papi === 'PUTRA') papi = 'PA';
        if (papi === 'P' || papi === 'PUTRI') papi = 'PI';
        if (papi !== 'PI') papi = 'PA';

        const blnRaw = getExcelColumnValue(row, ['bln_lahir', 'Bln Lahir', 'Bulan Lahir', 'Bulan']);
        const blnFormatted = blnRaw ? blnRaw.padStart(2, '0') : '';

        const tglRaw = getExcelColumnValue(row, ['tgl_lahir', 'Tgl Lahir', 'Tanggal Lahir', 'Tanggal']);
        const tglFormatted = tglRaw ? tglRaw.padStart(2, '0') : '';

        recordsToInsert.push({
          nis: getExcelColumnValue(row, ['nis', 'NIS', 'No Induk Santri']),
          nia: getExcelColumnValue(row, ['nia', 'NIA', 'Kode', 'Kode Guru']).toUpperCase(),
          nama_asatidz: nama,
          pa_pi: papi,
          tempat_lahir: getExcelColumnValue(row, ['tempat_lahir', 'Tempat Lahir', 'Tmp Lahir']),
          tgl_lahir: tglFormatted,
          bln_lahir: blnFormatted,
          thn_lahir: getExcelColumnValue(row, ['thn_lahir', 'Thn Lahir', 'Tahun Lahir', 'Tahun']),
          dusun: getExcelColumnValue(row, ['dusun', 'Dusun', 'Jalan', 'Alamat']),
          desa: getExcelColumnValue(row, ['desa', 'Desa', 'Kelurahan']),
          kecamatan: getExcelColumnValue(row, ['kecamatan', 'Kecamatan', 'Kec']),
          kabupaten: getExcelColumnValue(row, ['kabupaten', 'Kabupaten', 'Kota', 'Kab']),
          provinsi: getExcelColumnValue(row, ['provinsi', 'Provinsi', 'Prov']),
          blok: getExcelColumnValue(row, ['blok', 'Blok']),
          asrama: getExcelColumnValue(row, ['asrama', 'Asrama']),
          kode: getExcelColumnValue(row, ['kode', 'Kode Kamar', 'Kode Asrama']),
          kamar: getExcelColumnValue(row, ['kamar', 'Kamar', 'No Kamar']),
          tingkat_asatidz: getExcelColumnValue(row, ['tingkat_asatidz', 'Tingkat', 'Jenjang']).toUpperCase(),
          din_kls_asatidz: getExcelColumnValue(row, ['din_kls_asatidz', 'Din. Kls', 'Din Kls', 'Kelas']),
          din_bag_asatidz: getExcelColumnValue(row, ['din_bag_asatidz', 'Din. Bag', 'Din Bag', 'Bagian', 'Bag']).toUpperCase(),
          jah_asatidz: getExcelColumnValue(row, ['jah_asatidz', 'Jah', 'Jabatan']),
          lokasi_diniyyah: getExcelColumnValue(row, ['lokasi_diniyyah', 'Lokasi Diniyyah', 'Ruang Diniyyah']),
          lokasi_takror: getExcelColumnValue(row, ['lokasi_takror', 'Lokasi Takror', 'Ruang Takror']),
          foto_asatidz: getExcelColumnValue(row, ['foto_asatidz', 'Foto', 'URL Foto']),
        });
      });

      if (recordsToInsert.length === 0) {
        throw new Error('Tidak ditemukan baris data valid. Pastikan kolom "Nama Lengkap" atau "nama_asatidz" terisi.');
      }

      // Batch insert per 100 records
      const CHUNK_SIZE = 100;
      const totalChunks = Math.ceil(recordsToInsert.length / CHUNK_SIZE);

      for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
        const currentChunkIdx = Math.floor(i / CHUNK_SIZE) + 1;
        setProgressMsg(`Menyimpan batch ${currentChunkIdx} dari ${totalChunks} (${Math.min(i + CHUNK_SIZE, recordsToInsert.length)} data)...`);

        const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase.from('asatidz').insert(chunk);
        if (error) throw error;
      }

      await logActivity(
        'IMPORT EXCEL ASATIDZ',
        `Mengimpor massal ${recordsToInsert.length} data Asatidz dari file ${selectedFile.name}`
      );

      setSuccessCount(recordsToInsert.length);
      setProgressMsg('');
      await fetchAsatidz();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog
      isOpen={isImportModalOpen}
      onClose={handleClose}
      title="Import Massal Database Asatidz"
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Banner Deskripsi */}
        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl flex items-start gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-lg shrink-0 mt-0.5">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-emerald-950">
              Unggah File Spreadsheet (.xlsx / .xls / .csv)
            </h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Tambahkan data ratusan asatidz sekaligus ke dalam database. Pastikan format kolom sesuai dengan template standar sistem.
            </p>
          </div>
        </div>

        {/* Kotak Panduan Format Kolom Wajib & Download Template */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Format Kolom Wajib Baris Pertama:
            </div>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unduh Template Excel</span>
            </button>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Format kolom yang didukung: <code className="text-rose-600 font-semibold">Nama Lengkap</code> (atau <code className="text-rose-600 font-semibold">nama_asatidz</code>), <code className="text-rose-600 font-semibold">PA/PI</code> (PA/PI), <code className="text-rose-600 font-semibold">NIA</code>, <code className="text-rose-600 font-semibold">Tingkat</code>, <code className="text-rose-600 font-semibold">Din. Kls</code>, <code className="text-rose-600 font-semibold">Din. Bag</code>, dan <code className="text-rose-600 font-semibold">Jah</code>.
          </p>
        </div>

        {/* File Picker Drag & Drop Area */}
        <div
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
            selectedFile
              ? 'border-emerald-400 bg-emerald-50/40'
              : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/70'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <FileCheck className="w-10 h-10 text-emerald-600 animate-in zoom-in-75 duration-200" />
              <div className="text-xs font-bold text-slate-800">{selectedFile.name}</div>
              <div className="text-[11px] text-slate-500">
                Ukuran: {(selectedFile.size / 1024).toFixed(1)} KB — Klik untuk mengganti berkas
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <UploadCloud className="w-10 h-10 text-slate-400" />
              <div className="text-xs font-semibold text-slate-700">
                Klik atau seret file Excel ke sini
              </div>
              <div className="text-[11px] text-slate-400">
                Mendukung format berkas .xlsx, .xls, dan .csv
              </div>
            </div>
          )}
        </div>

        {/* Status Error */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Status Sukses */}
        {successCount !== null && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>
              <strong>Berhasil!</strong> Sebanyak <strong>{successCount}</strong> data asatidz berhasil diimpor ke database Supabase.
            </span>
          </div>
        )}

        {/* Progress Message */}
        {isProcessing && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs text-blue-700">
            <RefreshCw className="w-4 h-4 animate-spin text-blue-600 shrink-0" />
            <span>{progressMsg}</span>
          </div>
        )}

        {/* Footer Tombol Aksi */}
        <div className="flex justify-end items-center gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition disabled:opacity-50"
          >
            {successCount !== null ? 'Selesai' : 'Batal'}
          </button>

          <button
            type="button"
            onClick={handleProsesImport}
            disabled={!selectedFile || isProcessing}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-[#0f766e] hover:bg-[#115e59] text-white shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import ke Database</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
