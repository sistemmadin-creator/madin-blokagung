'use client';

import React, { useState, useRef } from 'react';
import Dialog from '@/components/ui/Dialog';
import { useSantriStore } from '@/stores/useSantriStore';
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
  X,
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

export default function ModalImportExcelSantri() {
  const { isImportModalOpen, closeImportModal, fetchSantri } = useSantriStore();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setSelectedFile(null);
    setIsProcessing(false);
    setProgressMsg('');
    setErrorMsg(null);
    setSuccessCount(null);
    setIsDragOver(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (isProcessing) return;
    resetState();
    closeImportModal();
  };

  const handleDownloadTemplate = () => {
    const headers = [
      'NIS (Nomor Induk Santri)',
      'Gender',
      'Nama Lengkap',
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
      'Tingkat',
      'Din. Kls',
      'Din. Bag',
      'Unit',
      'Jurusan',
      'Semester',
      'Kelas',
      'Bag',
      'Nama Ayah',
      'Telepon',
    ];

    const contohBaris1 = [
      '12345',
      'PA',
      'AHMAD MUZAKKI',
      'BANYUWANGI',
      '15',
      '04',
      '2009',
      'Krajan',
      'Karangdoro',
      'Tegalsari',
      'Banyuwangi',
      'Jawa Timur',
      'Induk',
      'Al-Falah',
      'A',
      '01',
      'ULA',
      '1',
      'A',
      'SMP Plus Darussalam',
      'Tahfidz',
      'Ganjil',
      'VII',
      'A',
      'H. ABDULLAH',
      '081234567890',
    ];

    const contohBaris2 = [
      '12346',
      'PI',
      'FATIMATUZ ZAHRO',
      'JEMBER',
      '20',
      '09',
      '2010',
      'Sumberjati',
      'Kalisat',
      'Kalisat',
      'Jember',
      'Jawa Timur',
      'Putri',
      'Al-Khadijah',
      'B',
      '03',
      'WUSTHO',
      '1',
      'B',
      'MTs Al Amiriyyah',
      'Reguler',
      'Ganjil',
      'VIII',
      'B',
      'AHMAD MUNIR',
      '082345678901',
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, contohBaris1, contohBaris2]);
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 5, 14) }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template_Santri');
    XLSX.writeFile(wb, 'Template_Import_Data_Santri.xlsx');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg(null);
      setSuccessCount(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
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
        const noInduk = getExcelColumnValue(row, [
          'no_induk',
          'NIS (Nomor Induk Santri)',
          'NIS',
          'No. Induk',
          'No Induk',
          'Nomor Induk',
          'Induk',
        ]).trim();

        const nama = getExcelColumnValue(row, [
          'nama',
          'Nama Lengkap',
          'Nama Lengkap Santri',
          'Nama Santri',
          'Santri',
          'Nama',
        ]).toUpperCase();

        // NIS dan Nama adalah identitas wajib minimal
        if (!noInduk || !nama) return;

        let papi = getExcelColumnValue(row, ['pa_pi', 'Gender', 'PA/PI', 'JK', 'L/P', 'Jenis Kelamin']).toUpperCase();
        if (papi === 'L' || papi === 'PUTRA') papi = 'PA';
        if (papi === 'P' || papi === 'PUTRI') papi = 'PI';
        if (papi !== 'PI') papi = 'PA';

        const blnRaw = getExcelColumnValue(row, ['bln_lahir', 'Bln Lahir', 'Bulan Lahir', 'Bulan']);
        const blnFormatted = blnRaw ? blnRaw.padStart(2, '0') : '';

        const tglRaw = getExcelColumnValue(row, ['tgl_lahir', 'Tgl Lahir', 'Tanggal Lahir', 'Tanggal']);
        const tglFormatted = tglRaw ? tglRaw.padStart(2, '0') : '';

        recordsToInsert.push({
          no_induk: noInduk,
          nama,
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
          kode: getExcelColumnValue(row, ['kode', 'Kode Kamar', 'Kode Asrama', 'Kode']),
          kamar: getExcelColumnValue(row, ['kamar', 'Kamar', 'No Kamar']),
          tingkat: getExcelColumnValue(row, ['tingkat', 'Tingkat', 'Jenjang']).toUpperCase(),
          din_kls: getExcelColumnValue(row, ['din_kls', 'Din. Kls', 'Din Kls', 'Kelas Diniyyah']),
          din_bag: getExcelColumnValue(row, ['din_bag', 'Din. Bag', 'Din Bag', 'Bagian Diniyyah', 'Bag Din']).toUpperCase(),
          unit: getExcelColumnValue(row, ['unit', 'Unit', 'Unit Pendidikan', 'Sekolah']),
          jurusan: getExcelColumnValue(row, ['jurusan', 'Jurusan']),
          semester: getExcelColumnValue(row, ['semester', 'Semester', 'Sem']),
          kelas: getExcelColumnValue(row, ['kelas', 'Kelas Formal', 'Kelas']),
          bag: getExcelColumnValue(row, ['bag', 'Bag Formal', 'Bagian', 'Bag']).toUpperCase(),
          nama_ayah: getExcelColumnValue(row, ['nama_ayah', 'Nama Ayah', 'Ayah']),
          telepon: getExcelColumnValue(row, ['telepon', 'Telepon', 'No HP', 'No. Telepon', 'HP']),
        });
      });

      if (recordsToInsert.length === 0) {
        throw new Error('Tidak ditemukan baris data valid. Pastikan kolom "NIS (Nomor Induk Santri)" dan "Nama Lengkap" terisi.');
      }

      // Batch upsert per 100 records (Opsi A: Upsert jika no_induk sudah ada)
      const CHUNK_SIZE = 100;
      const totalChunks = Math.ceil(recordsToInsert.length / CHUNK_SIZE);

      for (let i = 0; i < recordsToInsert.length; i += CHUNK_SIZE) {
        const currentChunkIdx = Math.floor(i / CHUNK_SIZE) + 1;
        setProgressMsg(`Menyimpan batch ${currentChunkIdx} dari ${totalChunks} (${Math.min(i + CHUNK_SIZE, recordsToInsert.length)} data)...`);

        const chunk = recordsToInsert.slice(i, i + CHUNK_SIZE);
        const { error } = await supabase
          .from('santri')
          .upsert(chunk, { onConflict: 'no_induk' });
        if (error) throw error;
      }

      await logActivity(
        'IMPORT EXCEL SANTRI',
        `Mengimpor massal ${recordsToInsert.length} data Santri dari file ${selectedFile.name}`
      );

      setSuccessCount(recordsToInsert.length);
      setProgressMsg('');
      await fetchSantri();
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
      title="Import Massal Database Santri"
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
              Tambahkan data ratusan santri sekaligus ke dalam database. Pastikan format kolom sesuai dengan template standar sistem.
            </p>
          </div>
        </div>

        {/* Kotak Panduan Format Kolom Wajib & Download Template */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>Format Kolom Wajib Baris Pertama:</span>
            </div>
            <button
              type="button"
              data-testid="btn-unduh-template-santri"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 text-xs font-bold shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Unduh Template Excel</span>
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Kolom Identitas Wajib: <strong className="text-rose-600">NIS (Nomor Induk Santri)</strong> (atau <code>no_induk</code>),{' '}
            <strong className="text-rose-600">Nama Lengkap</strong> (atau <code>nama</code>), dan{' '}
            <strong className="text-rose-600">Gender</strong> (<code>PA</code> / <code>PI</code>).
          </p>

          <div className="p-3 bg-white border border-emerald-200 rounded-lg text-[11px] text-emerald-900 leading-relaxed space-y-1">
            <p className="font-bold text-emerald-950">Catatan Data Kamar, Diniyyah &amp; Formal:</p>
            <p>
              • <strong>Kamar:</strong> Blok, Asrama, Kode, Kamar (contoh: Induk, Al-Falah, A, 01).
            </p>
            <p>
              • <strong>Madrasah Diniyyah:</strong> Tingkat (ULA, WUSTHO, ULYA), Din. Kls (1-4), Din. Bag (A, B, C...).
            </p>
            <p>
              • <strong>Sekolah Formal:</strong> Unit (SMP Plus, MTs, SMA, dll), Jurusan, Semester, Kelas, Bag.
            </p>
            <p className="text-slate-500 text-[10px]">
              *Jika NIS santri sudah ada di database, sistem otomatis memperbarui (*upsert*) dengan data terbaru dari Excel.
            </p>
          </div>
        </div>

        {/* Dropzone Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-6 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition ${
            isDragOver
              ? 'border-emerald-500 bg-emerald-50/50'
              : selectedFile
              ? 'border-emerald-400 bg-emerald-50/30'
              : 'border-slate-300 hover:border-emerald-400 bg-white'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={handleFileChange}
            className="hidden"
          />

          {selectedFile ? (
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800">{selectedFile.name}</p>
                <p className="text-[11px] text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Klik untuk mengganti berkas
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white transition ml-2"
                title="Hapus berkas terpilih"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              <div className="p-3 bg-slate-100 text-slate-500 rounded-full mb-2">
                <UploadCloud className="w-6 h-6" />
              </div>
              <p className="text-xs font-bold text-slate-700">
                Klik atau seret file Excel ke sini
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Mendukung format berkas .xlsx, .xls, dan .csv
              </p>
            </>
          )}
        </div>

        {/* Status & Error Message */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isProcessing && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-blue-700">
            <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
            <span>{progressMsg}</span>
          </div>
        )}

        {successCount !== null && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Berhasil mengimpor {successCount} data santri ke database!</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
          >
            {successCount !== null ? 'Tutup' : 'Batal'}
          </button>
          <button
            type="button"
            data-testid="btn-proses-import-santri"
            onClick={handleProsesImport}
            disabled={!selectedFile || isProcessing}
            className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer transition"
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
