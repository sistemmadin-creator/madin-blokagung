'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Send,
  MessageSquare,
  CheckCircle2,
  Settings,
  RefreshCw,
  Search,
  Eye,
  ExternalLink,
  Pause,
  Play,
  Square,
  FileText,
  Info,
  Download,
  Copy,
  History,
  BookOpen,
  Phone,
  X,
  AlertCircle,
} from 'lucide-react';
import { useSantriStore } from '@/stores/useSantriStore';
import { useAsatidzStore } from '@/stores/useAsatidzStore';
import { useFormasiStore } from '@/stores/useFormasiStore';
import { useMuhafadzohStore } from '@/stores/useMuhafadzohStore';
import { usePagePermission } from '@/stores/useRbacStore';
import {
  useSetorMustahiqStore,
  buildSantriSetorRow,
  computeMateriProgressForSantri,
} from '@/stores/useSetorMustahiqStore';
import { SantriSetorMustahiqRow, SetorMustahiqLog } from '@/types/setor-mustahiq';
import { formatTargetPreview, norm } from '@/lib/utils/setoranHelper';
import {
  getWahaConfig,
  saveWahaConfig,
  checkWahaSession,
  sendWahaImage,
  logoutWahaSession,
  compileMessage,
  generateDirectWaLink,
  formatPhoneNumber,
  getDeliveryLogs,
  saveDeliveryLog,
  getLatestDeliveryLog,
  isAlreadyDelivered,
  DEFAULT_WAHA_CONFIG,
  type WahaConfig,
  type WahaSessionStatus,
  type DeliveryLog,
} from '@/lib/services/wahaService';

export interface RaporHistoryItem {
  no: number;
  tanggal: string;
  catatan: string;
  tambah: string;
  status: string;
}

export interface SantriWaRaporRow {
  row: SantriSetorMustahiqRow;
  rawPhone: string;
  phone: string;
  hasPhone: boolean;
  isDelivered: boolean;
  deliveryStatus?: 'success' | 'failed' | 'manual';
  deliveryError?: string;
  totalCatatan: number;
  last3Logs: RaporHistoryItem[];
  targetPreview: string;
}

export default function KirimWaHafalanModule() {
  const searchParams = useSearchParams();
  const initialSantriParam = searchParams.get('santri') || '';
  const initialTahunParam = Number(searchParams.get('tahun')) || new Date().getFullYear();

  const { santriList, fetchSantri, saveSantri, isLoading: isLoadingSantri } = useSantriStore();
  const { asatidzList, fetchAsatidz } = useAsatidzStore();
  const { formasiList, fetchFormasi } = useFormasiStore();
  const { config: hafalanConfig, fetchSetoranData } = useMuhafadzohStore();
  const {
    logs: mustahiqLogs,
    activeStates,
    isLoading: isLoadingMustahiq,
    fetchMustahiqData,
  } = useSetorMustahiqStore();

  const {
    currentAccount,
    isMasterAdmin,
    isPersonAllowed,
    isClassAllowed,
  } = usePagePermission('kirim-wa');

  // State Konfigurasi WAHA & Status Gateway
  const [wahaConfig, setWahaConfig] = useState<WahaConfig>(DEFAULT_WAHA_CONFIG);
  const [gatewayStatus, setGatewayStatus] = useState<WahaSessionStatus>({
    online: false,
    status: 'OFFLINE',
    message: 'Belum diperiksa',
  });
  const [checkingGateway, setCheckingGateway] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);

  // Filter State
  const [tahun, setTahun] = useState<number>(initialTahunParam);
  const [filterTingkat, setFilterTingkat] = useState<string>('ALL');
  const [filterKelasKey, setFilterKelasKey] = useState<string>('ALL');
  const [filterKategori, setFilterKategori] = useState<string>('ALL');
  const [filterKamar, setFilterKamar] = useState<string>('ALL');
  const [filterStatusKirim, setFilterStatusKirim] = useState<'semua' | 'belum' | 'sudah'>('semua');
  const [search, setSearch] = useState<string>(initialSantriParam);

  // Checklist & Active Preview
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedPreviewNoInduk, setSelectedPreviewNoInduk] = useState<string | null>(
    initialSantriParam || null
  );
  const [deliveryLogs, setDeliveryLogs] = useState<DeliveryLog[]>([]);

  // Modal Edit Nomor WA Cepat (Gambar 2)
  const [editingPhoneRow, setEditingPhoneRow] = useState<SantriWaRaporRow | null>(null);
  const [phoneInputValue, setPhoneInputValue] = useState('');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  // Modal Panduan WA Web & Action State
  const [waWebModalInfo, setWaWebModalInfo] = useState<{
    open: boolean;
    namaSantri: string;
    phone: string;
    hasImageCopied: boolean;
  } | null>(null);
  const [isProcessingWaWeb, setIsProcessingWaWeb] = useState(false);
  const [isDownloadingRapor, setIsDownloadingRapor] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Broadcast Runner State
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [broadcastProgress, setBroadcastProgress] = useState({
    current: 0,
    completed: 0,
    total: 0,
    successCount: 0,
    failedCount: 0,
  });
  const [currentDelay, setCurrentDelay] = useState<number>(0);
  const [broadcastLogs, setBroadcastLogs] = useState<string[]>([]);
  const cancelBroadcastRef = useRef(false);
  const pauseBroadcastRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }, []);

  // Muat data awal
  useEffect(() => {
    fetchSantri();
    fetchAsatidz();
    fetchFormasi();
    fetchSetoranData();
    fetchMustahiqData();
  }, [fetchSantri, fetchAsatidz, fetchFormasi, fetchSetoranData, fetchMustahiqData]);

  const checkGateway = useCallback(async (cfg: WahaConfig) => {
    setCheckingGateway(true);
    try {
      const status = await checkWahaSession(cfg);
      setGatewayStatus(status);
    } catch {
      setGatewayStatus({
        online: false,
        status: 'OFFLINE',
        message: 'Server WAHA offline atau tidak dapat dihubungi.',
      });
    } finally {
      setCheckingGateway(false);
    }
  }, []);

  useEffect(() => {
    const loadedConfig = getWahaConfig();
    setWahaConfig(loadedConfig);
    setDeliveryLogs(getDeliveryLogs());
    void checkGateway(loadedConfig);
  }, [checkGateway]);

  // Auto-polling saat modal pengaturan terbuka dan menunggu scan QR
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    if (settingsModalOpen && gatewayStatus.status === 'SCAN_QR_CODE') {
      timer = setInterval(() => {
        void checkGateway(wahaConfig);
      }, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [settingsModalOpen, gatewayStatus.status, wahaConfig, checkGateway]);

  // Deteksi apakah akun yang login adalah Mustahiq spesifik untuk penguncian kelas otomatis
  const lockedMustahiqClass = useMemo(() => {
    if (!currentAccount || isMasterAdmin) return null;
    const accName = norm(currentAccount.full_name);
    const accUser = norm(currentAccount.username);
    if (!accName && !accUser) return null;

    const matchedAsatidz = asatidzList.find((a) => {
      const nAsatidz = norm(a.nama_asatidz);
      const niaAsatidz = norm(a.nia);
      return (
        (accName && nAsatidz && (nAsatidz === accName || nAsatidz.includes(accName))) ||
        (accUser && niaAsatidz && niaAsatidz === accUser)
      );
    });

    if (
      matchedAsatidz &&
      matchedAsatidz.tingkat_asatidz &&
      matchedAsatidz.din_kls_asatidz &&
      matchedAsatidz.din_bag_asatidz &&
      matchedAsatidz.tingkat_asatidz !== '-'
    ) {
      return {
        tingkat: norm(matchedAsatidz.tingkat_asatidz),
        din_kls: norm(matchedAsatidz.din_kls_asatidz),
        din_bag: norm(matchedAsatidz.din_bag_asatidz),
      };
    }

    const matchedFormasi = formasiList.find((f) => {
      const mName = norm(f.id_mustahiq);
      return accName && mName && (mName === accName || mName.includes(accName));
    });

    if (matchedFormasi) {
      return {
        tingkat: norm(matchedFormasi.tingkat),
        din_kls: norm(matchedFormasi.din_kls),
        din_bag: norm(matchedFormasi.din_bag),
      };
    }

    return null;
  }, [currentAccount, isMasterAdmin, asatidzList, formasiList]);

  // Bangun seluruh baris SantriWaRaporRow (Gabungan Gambar 2, 3, 4, dan 5)
  const allRaporRows: SantriWaRaporRow[] = useMemo(() => {
    // Referensi deliveryLogs agar useMemo reaktif saat status pengiriman berubah
    void deliveryLogs;

    const allowedSantri = santriList.filter((s) => {
      if (!s.no_induk || !s.nama) return false;
      const statusRaw =
        (s as unknown as Record<string, string>).status_santri ||
        (s as unknown as Record<string, string>).ket_status;
      if (statusRaw && norm(statusRaw) === 'BOYONG') return false;
      if (!isPersonAllowed(s)) return false;
      if (
        !isClassAllowed(
          {
            tingkat: s.tingkat,
            din_kls: s.din_kls,
            din_bag: s.din_bag,
            pa_pi: s.pa_pi,
          },
          santriList,
          asatidzList
        )
      ) {
        return false;
      }

      if (lockedMustahiqClass) {
        if (
          norm(s.tingkat) !== lockedMustahiqClass.tingkat ||
          norm(s.din_kls) !== lockedMustahiqClass.din_kls ||
          norm(s.din_bag) !== lockedMustahiqClass.din_bag
        ) {
          return false;
        }
      }

      return true;
    });

    return allowedSantri.map((s) => {
      const setorRow = buildSantriSetorRow(
        s,
        hafalanConfig,
        mustahiqLogs,
        activeStates,
        asatidzList,
        formasiList,
        tahun
      );

      const prog = computeMateriProgressForSantri(
        s.no_induk,
        setorRow.active_item,
        mustahiqLogs,
        tahun
      );

      // Ambil 3 riwayat setor terakhir secara kronologis (Opsi A - Gambar 4)
      const slicedLogs: SetorMustahiqLog[] = prog.matchingLogs.slice(-3);
      const last3Logs: RaporHistoryItem[] = slicedLogs.map((l, idx) => ({
        no: idx + 1,
        tanggal: l.tanggal,
        catatan: l.catatan || '',
        tambah:
          l.target_type === 'sentence'
            ? l.kalimat_dipilih || '-'
            : `+${l.tambah_angka || 0} ${l.satuan_angka || setorRow.satuan_label}`,
        status: l.status_ringkas,
      }));

      const rawPhone = String(s.telepon || '').trim();
      const phone = formatPhoneNumber(rawPhone);
      const hasPhone = Boolean(phone && phone.length >= 9);
      const latestLog = getLatestDeliveryLog(setorRow.no_induk, setorRow.active_item.nama);
      const isDelivered = isAlreadyDelivered(setorRow.no_induk, setorRow.active_item.nama);

      return {
        row: setorRow,
        rawPhone,
        phone,
        hasPhone,
        isDelivered,
        deliveryStatus: latestLog?.status,
        deliveryError: latestLog?.error,
        totalCatatan: prog.matchingLogs.length,
        last3Logs,
        targetPreview: formatTargetPreview(setorRow.active_item),
      };
    });
  }, [
    santriList,
    hafalanConfig,
    mustahiqLogs,
    activeStates,
    asatidzList,
    formasiList,
    tahun,
    isPersonAllowed,
    isClassAllowed,
    lockedMustahiqClass,
    deliveryLogs,
  ]);

  // Daftar kelas unik untuk pil tahapan kelas (seperti Tahap di Gambar 1)
  const kelasOptions = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        shortBadge: string;
        label: string;
        tingkat: string;
        din_kls: string;
        din_bag: string;
      }
    >();
    allRaporRows.forEach((item) => {
      const r = item.row;
      if (filterTingkat !== 'ALL' && r.tingkat !== filterTingkat) return;
      const key = `${r.din_kls}_${r.tingkat}_${r.din_bag}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          shortBadge: r.short_kelas_badge,
          label: r.kelas_label,
          tingkat: r.tingkat,
          din_kls: r.din_kls,
          din_bag: r.din_bag,
        });
      }
    });
    const orderTk: Record<string, number> = { ULA: 1, WUSTHO: 2, ULYA: 3 };
    return Array.from(map.values()).sort((a, b) => {
      const tA = orderTk[a.tingkat] || 99;
      const tB = orderTk[b.tingkat] || 99;
      if (tA !== tB) return tA - tB;
      const kCmp = a.din_kls.localeCompare(b.din_kls, 'id', { numeric: true });
      if (kCmp !== 0) return kCmp;
      return a.din_bag.localeCompare(b.din_bag, 'id');
    });
  }, [allRaporRows, filterTingkat]);

  // Daftar kamar unik untuk filter dropdown
  const kamarOptions = useMemo(() => {
    const set = new Set<string>();
    allRaporRows.forEach((item) => {
      if (item.row.kamar && item.row.kamar !== '-') {
        set.add(item.row.kamar);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  }, [allRaporRows]);

  // Filter baris yang tampil di tabel kiri
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRaporRows.filter((item) => {
      const r = item.row;
      if (filterTingkat !== 'ALL' && r.tingkat !== filterTingkat) return false;
      if (filterKelasKey !== 'ALL') {
        const key = `${r.din_kls}_${r.tingkat}_${r.din_bag}`;
        if (key !== filterKelasKey) return false;
      }
      if (filterKategori !== 'ALL' && r.active_kategori !== filterKategori) return false;
      if (filterKamar !== 'ALL' && r.kamar !== filterKamar) return false;
      if (filterStatusKirim === 'belum' && item.isDelivered) return false;
      if (filterStatusKirim === 'sudah' && !item.isDelivered) return false;

      if (q) {
        const matchNama = r.nama.toLowerCase().includes(q);
        const matchNis = r.no_induk.toLowerCase().includes(q);
        const matchKamar = r.kamar.toLowerCase().includes(q);
        const matchKelas = r.kelas_label.toLowerCase().includes(q) || r.short_kelas_badge.toLowerCase().includes(q);
        const matchPhone = item.phone.includes(q) || item.rawPhone.includes(q);
        const matchMateri = r.active_item.nama.toLowerCase().includes(q);
        if (!matchNama && !matchNis && !matchKamar && !matchKelas && !matchPhone && !matchMateri) {
          return false;
        }
      }

      return true;
    });
  }, [
    allRaporRows,
    filterTingkat,
    filterKelasKey,
    filterKategori,
    filterKamar,
    filterStatusKirim,
    search,
  ]);

  // Pilih baris pratinjau aktif secara otomatis
  const previewRow: SantriWaRaporRow | null = useMemo(() => {
    if (selectedPreviewNoInduk) {
      const found =
        filteredRows.find((r) => r.row.no_induk === selectedPreviewNoInduk) ||
        allRaporRows.find((r) => r.row.no_induk === selectedPreviewNoInduk);
      if (found) return found;
    }
    return filteredRows.length > 0 ? filteredRows[0] : null;
  }, [selectedPreviewNoInduk, filteredRows, allRaporRows]);

  // Checkbox handlers
  const handleToggleSelect = (noInduk: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noInduk)) next.delete(noInduk);
      else next.add(noInduk);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.size === filteredRows.length && filteredRows.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRows.map((r) => r.row.no_induk)));
    }
  };

  const handleSelectOnlyUnsent = () => {
    const unsent = filteredRows.filter((r) => !r.isDelivered && r.hasPhone);
    setSelectedIds(new Set(unsent.map((r) => r.row.no_induk)));
    showToast(`${unsent.length} santri yang belum dikirim berhasil dipilih.`);
  };

  // Helper membuat URL Kartu Rapor Digital Hafalan via Edge API (/api/og/rapor-hafalan)
  const buildRaporImageUrl = useCallback((item: SantriWaRaporRow): string => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const r = item.row;
    const params = new URLSearchParams({
      nama: r.nama,
      nis: r.no_induk,
      kamar: r.kamar || '-',
      mustahiq: r.mustahiq || '-',
      kelasBadge: `${r.short_kelas_badge} (${r.kelas_label})`,
      kategori: r.active_kategori,
      materi: r.active_item.nama,
      targetPreview: item.targetPreview,
      capaianText: r.status_badge_text,
      persen: String(r.progress_pct),
      satuan: r.satuan_label,
      totalCatatan: String(item.totalCatatan),
      tanggalCetak: new Date().toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }),
      history: JSON.stringify(item.last3Logs),
    });

    return `${origin}/api/og/rapor-hafalan?${params.toString()}`;
  }, []);

  // Helper membuat draf pesan teks WhatsApp
  const buildMessageText = useCallback(
    (item: SantriWaRaporRow): string => {
      const r = item.row;
      const riwayatLines =
        item.last3Logs.length > 0
          ? item.last3Logs
              .map(
                (l) =>
                  `${l.no}. ${l.tanggal} (${l.tambah}) -> *${l.status}*${
                    l.catatan ? ` _[${l.catatan}]_` : ''
                  }`
              )
              .join('\n')
          : '- Belum ada catatan riwayat setoran pada materi ini.';

      return compileMessage(wahaConfig.messageTemplate, {
        nama: r.nama,
        nis: r.no_induk,
        kelas: `${r.short_kelas_badge} (${r.kelas_label})`,
        kamar: r.kamar || '-',
        mustahiq: r.mustahiq || '-',
        materi: r.active_item.nama,
        kategori: r.active_kategori,
        target: item.targetPreview,
        capaian: r.status_badge_text,
        persen: String(r.progress_pct),
        status: r.is_target_met ? 'TUNTAS (100%)' : 'MASIH DALAM PROSES SETORAN',
        riwayat_terakhir: riwayatLines,
      });
    },
    [wahaConfig.messageTemplate]
  );

  const refreshLogsState = () => {
    setDeliveryLogs(getDeliveryLogs());
  };

  // Simpan nomor WA santri langsung ke tabel santri (Gambar 2)
  const handleSaveQuickPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhoneRow) return;
    const targetSantri = santriList.find((s) => s.no_induk === editingPhoneRow.row.no_induk);
    if (!targetSantri) return;

    setIsSavingPhone(true);
    const updatedSantri = {
      ...targetSantri,
      telepon: phoneInputValue.trim(),
    };
    const ok = await saveSantri(updatedSantri, true, targetSantri.no_induk);
    setIsSavingPhone(false);

    if (ok) {
      showToast(`No. Telepon / WA Aktif untuk ${targetSantri.nama} berhasil disimpan.`);
      setEditingPhoneRow(null);
    }
  };

  // Kirim 1 nomor santri via WAHA Gateway
  const handleSendSingleWaha = async (item: SantriWaRaporRow) => {
    if (!item.hasPhone) {
      setEditingPhoneRow(item);
      setPhoneInputValue(item.rawPhone || '');
      return;
    }
    if (!gatewayStatus.online) {
      alert(
        "Server WAHA belum terhubung. Silakan buka 'Pengaturan Gateway' atau gunakan tombol 'Kirim via WA Web'."
      );
      return;
    }

    const imageUrl = buildRaporImageUrl(item);
    const text = buildMessageText(item);

    showToast(`Mengirim Kartu Rapor Digital ke wali ${item.row.nama}...`);
    const res = await sendWahaImage(wahaConfig, item.phone, imageUrl, text);

    if (res.success) {
      saveDeliveryLog({
        noInduk: item.row.no_induk,
        namaSantri: item.row.nama,
        noWa: item.phone,
        materi: item.row.active_item.nama,
        kategori: item.row.active_kategori,
        capaian: `${item.row.status_badge_text} (${item.row.progress_pct}%)`,
        status: 'success',
      });
      refreshLogsState();
      showToast(`Kartu Rapor berhasil dikirim ke nomor wali ${item.row.nama}!`);
    } else {
      saveDeliveryLog({
        noInduk: item.row.no_induk,
        namaSantri: item.row.nama,
        noWa: item.phone,
        materi: item.row.active_item.nama,
        kategori: item.row.active_kategori,
        capaian: `${item.row.status_badge_text} (${item.row.progress_pct}%)`,
        status: 'failed',
        error: res.error,
      });
      refreshLogsState();
      alert(`Gagal mengirim: ${res.error}`);
    }
  };

  // Unduh gambar Kartu Rapor Digital sebagai PNG
  const handleDownloadRaporImage = async (item: SantriWaRaporRow) => {
    setIsDownloadingRapor(true);
    try {
      const imageUrl = buildRaporImageUrl(item);
      const res = await fetch(imageUrl);
      const blob = await res.blob();

      const sanitizedName = item.row.nama
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '');
      const fileName = `Rapor_Hafalan_${sanitizedName}_${item.row.short_kelas_badge}.png`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast(`Kartu rapor ${item.row.nama} berhasil diunduh!`);
    } catch (err) {
      console.error('Gagal mengunduh kartu rapor', err);
      alert('Terjadi kendala saat mengunduh gambar kartu rapor.');
    } finally {
      setIsDownloadingRapor(false);
    }
  };

  // Salin gambar Kartu Rapor ke Clipboard
  const handleCopyRaporImage = async (item: SantriWaRaporRow) => {
    try {
      const imageUrl = buildRaporImageUrl(item);
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      showToast('Gambar Kartu Rapor berhasil disalin ke clipboard!');
    } catch (err) {
      console.error('Gagal menyalin gambar ke clipboard', err);
      alert('Browser tidak mengizinkan salin gambar otomatis. Silakan gunakan tombol Unduh.');
    }
  };

  // Kirim via WhatsApp Web dengan Auto-Copy Gambar ke Clipboard & Mobile Share API
  const handleOpenDirectWa = async (item: SantriWaRaporRow) => {
    if (!item.hasPhone) {
      setEditingPhoneRow(item);
      setPhoneInputValue(item.rawPhone || '');
      return;
    }

    setIsProcessingWaWeb(true);
    const text = buildMessageText(item);
    const link = generateDirectWaLink(item.phone, text);
    const imageUrl = buildRaporImageUrl(item);

    // 1. Jika di HP (Mobile), gunakan Web Share API bawaan Android/iOS bila tersedia
    const isMobile =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

    if (isMobile && typeof navigator.share === 'function') {
      try {
        const imgRes = await fetch(imageUrl);
        const blob = await imgRes.blob();
        const file = new File(
          [blob],
          `Rapor_Hafalan_${item.row.nama.replace(/\s+/g, '_')}.png`,
          { type: 'image/png' }
        );

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            text,
            title: `Kartu Rapor Hafalan ${item.row.nama}`,
          });

          saveDeliveryLog({
            noInduk: item.row.no_induk,
            namaSantri: item.row.nama,
            noWa: item.phone,
            materi: item.row.active_item.nama,
            kategori: item.row.active_kategori,
            capaian: `${item.row.status_badge_text} (${item.row.progress_pct}%)`,
            status: 'manual',
          });
          refreshLogsState();
          showToast('Berhasil membagikan Kartu Rapor ke WhatsApp!');
          setIsProcessingWaWeb(false);
          return;
        }
      } catch (shareErr: unknown) {
        if (shareErr instanceof Error && shareErr.name === 'AbortError') {
          setIsProcessingWaWeb(false);
          return;
        }
      }
    }

    // 2. Desktop: Otomatis salin Gambar Rapor ke Clipboard & buka WA Web
    let imageCopied = false;
    try {
      const imgRes = await fetch(imageUrl);
      const blob = await imgRes.blob();
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      imageCopied = true;
    } catch {
      // Clipboard mungkin dibatasi browser
    }

    saveDeliveryLog({
      noInduk: item.row.no_induk,
      namaSantri: item.row.nama,
      noWa: item.phone,
      materi: item.row.active_item.nama,
      kategori: item.row.active_kategori,
      capaian: `${item.row.status_badge_text} (${item.row.progress_pct}%)`,
      status: 'manual',
    });
    refreshLogsState();

    window.open(link, '_blank');

    setWaWebModalInfo({
      open: true,
      namaSantri: item.row.nama,
      phone: item.phone,
      hasImageCopied: imageCopied,
    });

    setIsProcessingWaWeb(false);
  };

  // ==================== ENGINE BROADCAST MASSAL ====================
  const handleStartBroadcast = async () => {
    const targetRows = allRaporRows.filter((r) => selectedIds.has(r.row.no_induk));

    if (targetRows.length === 0) {
      alert('Pilih minimal satu santri yang ingin dikirimi broadcast.');
      return;
    }

    const withoutPhone = targetRows.filter((r) => !r.hasPhone);
    if (withoutPhone.length > 0) {
      const confirmContinue = confirm(
        `Perhatian: Ada ${withoutPhone.length} santri yang belum memiliki No. Telepon / WA Aktif dan akan dilewati. Lanjutkan mengirim ke ${
          targetRows.length - withoutPhone.length
        } nomor valid?`
      );
      if (!confirmContinue) return;
    }

    const validRows = targetRows.filter((r) => r.hasPhone);
    if (validRows.length === 0) {
      alert('Tidak ada nomor WhatsApp yang valid untuk dikirim.');
      return;
    }

    if (!gatewayStatus.online) {
      const openCfg = confirm(
        'Server WAHA belum terhubung secara online.\n\nApakah Anda ingin membuka Pengaturan Gateway WAHA untuk memindai QR Code?'
      );
      if (openCfg) {
        setSettingsModalOpen(true);
      }
      return;
    }

    setIsBroadcasting(true);
    setIsPaused(false);
    cancelBroadcastRef.current = false;
    pauseBroadcastRef.current = false;
    setBroadcastProgress({
      current: 0,
      completed: 0,
      total: validRows.length,
      successCount: 0,
      failedCount: 0,
    });
    setBroadcastLogs([
      `[${new Date().toLocaleTimeString()}] Memulai broadcast Kartu Rapor Hafalan ke ${validRows.length} nomor...`,
    ]);

    let localSuccess = 0;
    let localFailed = 0;

    for (let i = 0; i < validRows.length; i++) {
      if (cancelBroadcastRef.current) {
        setBroadcastLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] Broadcast dihentikan oleh pengguna.`,
        ]);
        break;
      }

      while (pauseBroadcastRef.current) {
        await new Promise((r) => setTimeout(r, 500));
        if (cancelBroadcastRef.current) break;
      }

      const item = validRows[i];
      setBroadcastProgress((prev) => ({
        ...prev,
        current: i + 1,
      }));

      try {
        const imageUrl = buildRaporImageUrl(item);
        const text = buildMessageText(item);

        setBroadcastLogs((prev) => [
          ...prev,
          `[${new Date().toLocaleTimeString()}] (${i + 1}/${validRows.length}) Mengirim ke ${
            item.row.nama
          } (${item.phone})...`,
        ]);

        const res = await sendWahaImage(wahaConfig, item.phone, imageUrl, text);

        if (res.success) {
          localSuccess += 1;
          saveDeliveryLog({
            noInduk: item.row.no_induk,
            namaSantri: item.row.nama,
            noWa: item.phone,
            materi: item.row.active_item.nama,
            kategori: item.row.active_kategori,
            capaian: `${item.row.status_badge_text} (${item.row.progress_pct}%)`,
            status: 'success',
          });
          setBroadcastLogs((prev) => [
            ...prev,
            `  ✓ Berhasil terkirim ke ${item.row.nama}.`,
          ]);
        } else {
          localFailed += 1;
          saveDeliveryLog({
            noInduk: item.row.no_induk,
            namaSantri: item.row.nama,
            noWa: item.phone,
            materi: item.row.active_item.nama,
            kategori: item.row.active_kategori,
            capaian: `${item.row.status_badge_text} (${item.row.progress_pct}%)`,
            status: 'failed',
            error: res.error,
          });
          setBroadcastLogs((prev) => [
            ...prev,
            `  ✕ GAGAL ke ${item.row.nama}: ${res.error}`,
          ]);
        }
      } catch (e: unknown) {
        localFailed += 1;
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setBroadcastLogs((prev) => [
          ...prev,
          `  ✕ Error sistem saat memproses ${item.row.nama}: ${msg}`,
        ]);
      }

      setBroadcastProgress({
        current: i + 1,
        completed: i + 1,
        total: validRows.length,
        successCount: localSuccess,
        failedCount: localFailed,
      });
      refreshLogsState();

      if (i < validRows.length - 1 && !cancelBroadcastRef.current) {
        const delaySeconds =
          Math.floor(Math.random() * (wahaConfig.delayMax - wahaConfig.delayMin + 1)) +
          wahaConfig.delayMin;
        setBroadcastLogs((prev) => [
          ...prev,
          `  Jeda aman anti-banned: ${delaySeconds} detik...`,
        ]);

        for (let s = delaySeconds; s > 0; s--) {
          if (cancelBroadcastRef.current) break;
          setCurrentDelay(s);
          await new Promise((r) => setTimeout(r, 1000));
        }
        setCurrentDelay(0);
      }
    }

    setBroadcastLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Selesai: ${localSuccess} berhasil terkirim, ${localFailed} gagal.`,
    ]);
    setIsBroadcasting(false);
    refreshLogsState();
    showToast(
      `Broadcast selesai: ${localSuccess} berhasil, ${localFailed} gagal.`
    );
  };

  const handlePauseResume = () => {
    const next = !isPaused;
    setIsPaused(next);
    pauseBroadcastRef.current = next;
  };

  const handleCancelBroadcast = () => {
    cancelBroadcastRef.current = true;
    setIsBroadcasting(false);
    setIsPaused(false);
  };

  const isLoading = isLoadingSantri || isLoadingMustahiq;

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-50 bg-emerald-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/30 animate-in fade-in"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* 1. Header Utama & Status Gateway (Sesuai Gambar 1) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <span className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </span>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
              Kirim WhatsApp Rapor Hafalan
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm text-slate-500 max-w-2xl">
              Otomasi pengiriman Kartu Rapor Digital Hafalan beserta 3 riwayat setor terakhir langsung ke nomor WhatsApp wali santri.
            </p>
          </div>
        </div>

        {/* Status Sinyal WAHA & Aksi Pengaturan */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-testid="btn-status-waha"
            onClick={() => checkGateway(wahaConfig)}
            disabled={checkingGateway}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition shadow-2xs cursor-pointer ${
              gatewayStatus.online
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-700 border-rose-300'
            }`}
            title="Klik untuk menyegarkan status koneksi WAHA"
          >
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                gatewayStatus.online ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span>
              {checkingGateway
                ? 'Memeriksa...'
                : gatewayStatus.online
                ? `WAHA Aktif (${gatewayStatus.phone || 'Connected'})`
                : 'WAHA Belum Terhubung'}
            </span>
            <RefreshCw className={`w-3.5 h-3.5 ${checkingGateway ? 'animate-spin' : ''}`} />
          </button>

          {!gatewayStatus.online && (
            <button
              type="button"
              data-testid="btn-scan-qr-waha"
              onClick={() => {
                setSettingsModalOpen(true);
                void checkGateway(wahaConfig);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-400 bg-amber-50 hover:bg-amber-100 text-xs font-bold text-amber-900 transition shadow-2xs cursor-pointer"
              title="Pindai QR Code untuk menghubungkan nomor WhatsApp pengirim"
            >
              <Phone className="w-3.5 h-3.5 text-amber-700" />
              <span>Scan QR WhatsApp</span>
            </button>
          )}

          <button
            type="button"
            data-testid="btn-open-draf-pesan"
            onClick={() => setTemplateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
          >
            <FileText className="w-4 h-4 text-emerald-700" />
            <span>Draf Pesan</span>
          </button>

          <button
            type="button"
            data-testid="btn-open-gateway-settings"
            onClick={() => setSettingsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs font-bold text-slate-700 hover:bg-slate-100 transition shadow-2xs cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-600" />
            <span>Pengaturan Gateway</span>
          </button>

          <Link
            href="/setor-mustahiq"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-xs font-bold text-emerald-800 transition shadow-2xs"
          >
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <span>Halaman Setor Mustahiq</span>
          </Link>
        </div>
      </div>

      {/* 2. Banner Notifikasi jika Gateway Offline (Sesuai Gambar 1) */}
      {!gatewayStatus.online && (
        <div
          data-testid="banner-waha-offline"
          className="bg-amber-50/90 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-900"
        >
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Mode Server WAHA Sedang Offline:</span>
            <p className="mt-0.5 text-amber-800 leading-relaxed">
              Jika server WAHA belum dinyalakan di komputer/VPS, Anda tetap dapat melakukan pengiriman secara langsung menggunakan tombol{' '}
              <span className="font-semibold underline">&quot;Kirim via WA Web&quot;</span> pada masing-masing baris santri di tabel bawah ini atau pada panel pratinjau.
            </p>
          </div>
        </div>
      )}

      {/* 3. Progress & Ringkasan Hasil Broadcast Massal */}
      {(isBroadcasting || broadcastLogs.length > 0) && (
        <div
          data-testid="panel-broadcast-progress"
          className="bg-emerald-950 text-white rounded-2xl p-5 shadow-xl border border-emerald-500/40 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    isBroadcasting
                      ? 'bg-emerald-400 animate-ping'
                      : broadcastProgress.failedCount > 0 && broadcastProgress.successCount === 0
                      ? 'bg-rose-400'
                      : broadcastProgress.failedCount > 0
                      ? 'bg-amber-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <h3 className="font-bold text-sm sm:text-base">
                  {isBroadcasting
                    ? 'Sedang Mengirim Broadcast Kartu Rapor Digital...'
                    : broadcastProgress.failedCount > 0 && broadcastProgress.successCount === 0
                    ? `Broadcast Gagal Terkirim (${broadcastProgress.failedCount} Gagal)`
                    : broadcastProgress.failedCount > 0
                    ? `Broadcast Selesai Sebagian (${broadcastProgress.successCount} Berhasil, ${broadcastProgress.failedCount} Gagal)`
                    : `Broadcast Selesai (${broadcastProgress.successCount} Berhasil Terkirim)`}
                </h3>
              </div>
              <p className="text-xs text-emerald-200 mt-1">
                {isBroadcasting ? (
                  <>
                    Memproses {broadcastProgress.current} dari {broadcastProgress.total} santri (
                    {broadcastProgress.completed} selesai)
                    {currentDelay > 0 && ` • Jeda aman anti-banned: ${currentDelay} detik lagi...`}
                  </>
                ) : (
                  <>
                    Total diproses: {broadcastProgress.completed} dari {broadcastProgress.total}{' '}
                    santri • {broadcastProgress.successCount} Berhasil •{' '}
                    {broadcastProgress.failedCount} Gagal
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isBroadcasting ? (
                <>
                  <button
                    type="button"
                    onClick={handlePauseResume}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition cursor-pointer"
                  >
                    {isPaused ? (
                      <Play className="w-3.5 h-3.5" />
                    ) : (
                      <Pause className="w-3.5 h-3.5" />
                    )}
                    <span>{isPaused ? 'Lanjutkan' : 'Jeda'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCancelBroadcast}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition cursor-pointer"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span>Hentikan</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  data-testid="btn-close-broadcast-log"
                  onClick={() => setBroadcastLogs([])}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-bold text-white transition cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Tutup Log</span>
                </button>
              )}
            </div>
          </div>

          <div className="w-full bg-emerald-900 rounded-full h-3 overflow-hidden">
            <div
              data-testid="broadcast-progress-bar"
              className={`h-full transition-all duration-300 ${
                !isBroadcasting &&
                broadcastProgress.failedCount > 0 &&
                broadcastProgress.successCount === 0
                  ? 'bg-rose-400'
                  : 'bg-emerald-400'
              }`}
              style={{
                width: `${
                  broadcastProgress.total > 0
                    ? (broadcastProgress.completed / broadcastProgress.total) * 100
                    : 0
                }%`,
              }}
            />
          </div>

          <div
            data-testid="broadcast-logs-container"
            className="bg-black/40 rounded-xl p-3 font-mono text-[11px] text-emerald-300 max-h-40 overflow-y-auto space-y-1"
          >
            {broadcastLogs.slice(-8).map((log, idx) => (
              <div
                key={idx}
                className={
                  log.includes('✕') ? 'text-rose-300 font-semibold whitespace-pre-wrap' : 'truncate'
                }
              >
                {log}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Panel Pemilihan Tingkat, Kelas, Filter & Broadcast (Sesuai Gambar 1) */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {/* Baris Atas: Tab Tingkat + Tombol Broadcast */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: 'ALL', label: 'Semua Tingkat' },
                { key: 'ULA', label: 'Tingkat Ula' },
                { key: 'WUSTHO', label: 'Tingkat Wustho' },
                { key: 'ULYA', label: 'Tingkat Ulya' },
              ] as const
            ).map((tk) => (
              <button
                key={tk.key}
                type="button"
                onClick={() => {
                  setFilterTingkat(tk.key);
                  setFilterKelasKey('ALL');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  filterTingkat === tk.key
                    ? 'bg-[#0b5751] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tk.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            data-testid="btn-start-broadcast-wa"
            onClick={handleStartBroadcast}
            disabled={isBroadcasting || selectedIds.size === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold transition shadow-sm disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Mulai Kirim Broadcast ({selectedIds.size} Santri)</span>
          </button>
        </div>

        {/* Baris Kedua: Pil Kelas Diniyyah (Horizontal Scroll seperti Tahap di Gambar 1) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setFilterKelasKey('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              filterKelasKey === 'ALL'
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
            }`}
          >
            Semua Kelas ({allRaporRows.length})
          </button>
          {kelasOptions.map((kls) => (
            <button
              key={kls.key}
              type="button"
              onClick={() => setFilterKelasKey(kls.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                filterKelasKey === kls.key
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-400'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200/70'
              }`}
            >
              {kls.shortBadge} ({kls.label})
            </button>
          ))}
        </div>

        {/* Baris Ketiga: Pencarian & Dropdown Filter */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
          {/* Kolom Cari */}
          <div className="sm:col-span-4 relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              data-testid="input-search-kirim-wa"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama santri, NIS, kamar, atau nomor WA..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 focus:outline-none focus:border-emerald-600"
            />
          </div>

          {/* Filter Tahun */}
          <div className="sm:col-span-2">
            <select
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              aria-label="Filter Tahun Setoran"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700"
            >
              {[2026, 2025, 2024, 2027].map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Kategori Hafalan */}
          <div className="sm:col-span-2">
            <select
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
              aria-label="Filter Kategori Hafalan"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="Wajib">Hafalan Wajib</option>
              <option value="Sunnah">Hafalan Sunnah</option>
              <option value="Kitab">Hafalan Kitab</option>
            </select>
          </div>

          {/* Filter Kamar */}
          <div className="sm:col-span-2">
            <select
              value={filterKamar}
              onChange={(e) => setFilterKamar(e.target.value)}
              aria-label="Filter Kamar Santri"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700"
            >
              <option value="ALL">Semua Kamar</option>
              {kamarOptions.map((kmr) => (
                <option key={kmr} value={kmr}>
                  Kamar {kmr}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Status Pengiriman */}
          <div className="sm:col-span-2">
            <select
              value={filterStatusKirim}
              onChange={(e) =>
                setFilterStatusKirim(e.target.value as 'semua' | 'belum' | 'sudah')
              }
              aria-label="Filter Status Pengiriman"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-700"
            >
              <option value="semua">Semua Status Pengiriman</option>
              <option value="belum">Belum Pernah Dikirim</option>
              <option value="sudah">Sudah Pernah Dikirim</option>
            </select>
          </div>
        </div>
      </div>

      {/* 5. Grid Utama: Tabel Santri (Kiri 7 Kolom) & Live Pratinjau Kartu Rapor (Kanan 5 Kolom) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ==================== TABEL SANTRI & CHECKLIST (7 Kolom) ==================== */}
        <div className="lg:col-span-7 min-w-0 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={
                    filteredRows.length > 0 && selectedIds.size === filteredRows.length
                  }
                  onChange={handleSelectAllFiltered}
                  className="rounded text-emerald-700 focus:ring-emerald-600 accent-emerald-700 w-4 h-4 cursor-pointer"
                />
                <span>Pilih Semua ({filteredRows.length})</span>
              </label>

              <button
                type="button"
                onClick={handleSelectOnlyUnsent}
                className="text-[11px] text-emerald-800 hover:underline font-semibold cursor-pointer"
              >
                Pilih yang Belum Dikirim
              </button>
            </div>

            <span className="text-[11px] text-slate-500">
              Terpilih: <strong className="text-slate-900">{selectedIds.size}</strong> santri
            </span>
          </div>

          <div
            data-testid="list-santri-kirim-wa"
            className="overflow-x-auto max-h-[640px] overflow-y-auto divide-y divide-slate-100"
          >
            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Memuat data setoran hafalan santri...
              </div>
            ) : filteredRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                Tidak ada data santri yang cocok dengan filter pencarian ini.
              </div>
            ) : (
              filteredRows.map((item) => {
                const r = item.row;
                const isSelected = selectedIds.has(r.no_induk);
                const isCurrentPreview = previewRow?.row.no_induk === r.no_induk;

                return (
                  <div
                    key={r.no_induk}
                    data-testid={`wa-row-${r.no_induk}`}
                    onClick={() => setSelectedPreviewNoInduk(r.no_induk)}
                    className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isCurrentPreview
                        ? 'bg-emerald-50/80 border-l-4 border-l-emerald-700'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Kiri: Checkbox, Nama, Kelas, Kamar, Nomor WA (Gambar 2) */}
                    <div className="flex items-start gap-3 min-w-0">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleToggleSelect(r.no_induk);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="mt-0.5 rounded text-emerald-700 focus:ring-emerald-600 accent-emerald-700 w-4 h-4 cursor-pointer shrink-0"
                      />

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {r.nama}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                            {r.short_kelas_badge} ({r.kelas_label})
                          </span>
                          {item.deliveryStatus === 'success' && (
                            <span
                              data-testid="badge-wa-terkirim"
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Terkirim
                            </span>
                          )}
                          {item.deliveryStatus === 'manual' && (
                            <span
                              data-testid="badge-wa-manual"
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 shrink-0"
                            >
                              <ExternalLink className="w-3 h-3 text-teal-600" /> Dibuka di WA Web
                            </span>
                          )}
                          {item.deliveryStatus === 'failed' && (
                            <span
                              data-testid="badge-wa-gagal"
                              title={item.deliveryError || 'Gagal mengirim pesan'}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-800 shrink-0"
                            >
                              <AlertCircle className="w-3 h-3 text-rose-600" /> Gagal Kirim
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                          NIS: {r.no_induk} • Kamar: {r.kamar} • Mustahiq: {r.mustahiq}
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span>No. Telepon / WA:</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPhoneRow(item);
                              setPhoneInputValue(item.rawPhone || '');
                            }}
                            className={`inline-flex items-center gap-1 font-mono font-semibold underline cursor-pointer ${
                              item.hasPhone
                                ? 'text-slate-800 hover:text-emerald-700'
                                : 'text-rose-600 hover:text-rose-700'
                            }`}
                            title="Klik untuk mengisi atau mengubah No. Telepon / WA Aktif santri"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{item.hasPhone ? item.phone : 'Belum Ada (Isi Nomor)'}</span>
                          </button>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-600 font-medium">
                            {item.totalCatatan} Catatan Setor
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Kanan: Capaian Hafalan & Aksi Cepat */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right hidden sm:block">
                        <div className="font-bold text-[11px] text-slate-800 max-w-[160px] truncate">
                          {r.active_item.nama}
                        </div>
                        <span
                          className={`inline-block mt-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md font-mono ${
                            r.is_target_met
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {r.status_badge_text} ({r.progress_pct}%)
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleSendSingleWaha(item);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-emerald-50 text-emerald-800 transition cursor-pointer"
                          title={
                            item.hasPhone
                              ? 'Kirim instan via WAHA Gateway'
                              : 'Isi nomor WA santri terlebih dahulu'
                          }
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleOpenDirectWa(item);
                          }}
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 transition cursor-pointer"
                          title="Kirim via WhatsApp Web"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ==================== LIVE PRATINJAU KARTU RAPOR DIGITAL (5 Kolom) ==================== */}
        <div className="lg:col-span-5 min-w-0 space-y-4">
          <div
            data-testid="panel-pratinjau-rapor"
            className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-xs space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-700" />
                <span>Pratinjau Kartu Rapor Digital</span>
              </span>

              {previewRow && (
                <span className="text-[11px] font-bold text-emerald-800 truncate max-w-[190px]">
                  {previewRow.row.nama}
                </span>
              )}
            </div>

            {previewRow ? (
              <div className="space-y-4">
                {/* 1. Pratinjau Visual Kartu Rapor Digital Hafalan (Gabungan Gambar 3 & Gambar 4) */}
                <div
                  data-testid="kartu-rapor-digital-preview"
                  className="rounded-2xl border-2 border-emerald-600 bg-white shadow-sm overflow-hidden"
                >
                  {/* Header Kartu Rapor */}
                  <div className="bg-emerald-900 text-white px-4 py-3 border-b-2 border-emerald-500 flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-extrabold tracking-tight uppercase">
                        Madrasah Diniyyah Al Amiriyyah
                      </div>
                      <div className="text-[10px] text-emerald-200 font-medium">
                        Kartu Rapor Digital Hafalan Santri • Tahun {tahun}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-800 border border-emerald-400 text-[10px] font-bold">
                      Hafalan {previewRow.row.active_kategori}
                    </span>
                  </div>

                  {/* Isi Kartu Rapor: Bagian 1 (Gambar 3) + Bagian 2 (Gambar 4: 3 Riwayat Setor Terakhir) */}
                  <div className="p-4 space-y-3.5">
                    {/* Bagian 1: Identitas, Target & Capaian Setoran (Gambar 3) */}
                    <div className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3
                            data-testid="preview-santri-nama"
                            className="text-sm font-extrabold text-slate-900"
                          >
                            {previewRow.row.nama}
                          </h3>
                          <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                            NIS: {previewRow.row.no_induk} • Kamar: {previewRow.row.kamar} • Mustahiq:{' '}
                            {previewRow.row.mustahiq}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-wrap justify-end">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            {previewRow.row.short_kelas_badge} ({previewRow.row.kelas_label})
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                            Hafalan {previewRow.row.active_kategori}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] gap-2">
                        <span className="text-slate-500">Target Hafalan Saat Ini:</span>
                        <span
                          data-testid="preview-target-hafalan"
                          className="font-bold text-slate-900 text-right"
                        >
                          {previewRow.row.active_item.nama} ({previewRow.targetPreview})
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-600 font-medium">
                            Capaian Setoran Hafalan:
                          </span>
                          <span
                            data-testid="preview-capaian-hafalan"
                            className="font-bold text-emerald-800 font-mono"
                          >
                            {previewRow.row.status_badge_text} ({previewRow.row.progress_pct}%)
                          </span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${previewRow.row.progress_pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bagian 2: 3 Riwayat Setor Terakhir (Gambar 4) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-slate-500" />
                          <span>Riwayat Setor ({previewRow.row.active_item.nama})</span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-semibold">
                          {previewRow.last3Logs.length > 0
                            ? `${previewRow.last3Logs.length} Riwayat Terakhir (Total ${previewRow.totalCatatan} Catatan)`
                            : '0 Catatan'}
                        </span>
                      </div>

                      {previewRow.last3Logs.length === 0 ? (
                        <div
                          data-testid="preview-empty-riwayat"
                          className="p-4 rounded-xl border border-slate-200 text-center text-[11px] text-slate-400"
                        >
                          Belum ada riwayat setoran untuk materi{' '}
                          <span className="font-semibold text-slate-600">
                            {previewRow.row.active_item.nama}
                          </span>{' '}
                          di tahun {tahun}.
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-xl overflow-hidden">
                          <table
                            data-testid="preview-table-riwayat-3"
                            className="w-full text-left border-collapse text-[11px]"
                          >
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500">
                                <th className="py-1.5 px-2.5 w-8">No</th>
                                <th className="py-1.5 px-2.5">Tanggal</th>
                                <th className="py-1.5 px-2.5 text-center">
                                  Tambah {previewRow.row.satuan_label}
                                </th>
                                <th className="py-1.5 px-2.5">Rincian Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {previewRow.last3Logs.map((l) => (
                                <tr key={l.no} className="bg-white">
                                  <td className="py-2 px-2.5 font-mono text-slate-400">
                                    {l.no}
                                  </td>
                                  <td className="py-2 px-2.5 font-mono text-slate-700">
                                    {l.tanggal}
                                    {l.catatan && (
                                      <p className="text-[10px] font-sans text-slate-400 italic">
                                        {l.catatan}
                                      </p>
                                    )}
                                  </td>
                                  <td className="py-2 px-2.5 text-center">
                                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-mono font-bold text-[10px]">
                                      {l.tambah}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2.5 font-mono text-[10px] text-emerald-800 font-semibold">
                                    {l.status}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Tampilan Gambar PNG Hasil Render Edge API (/api/og/rapor-hafalan) */}
                <details className="group rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-xs">
                  <summary className="cursor-pointer font-semibold text-slate-700 flex items-center justify-between select-none">
                    <span>Lihat Hasil Render Gambar PNG (Siap Lampir WA)</span>
                    <span className="text-[10px] text-emerald-700 font-bold">1200 x 720 px</span>
                  </summary>
                  <div className="mt-2.5 rounded-lg overflow-hidden border border-slate-200 bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={buildRaporImageUrl(previewRow)}
                      alt={`Kartu Rapor Digital Hafalan ${previewRow.row.nama}`}
                      className="w-full h-auto block select-none"
                      loading="lazy"
                    />
                  </div>
                </details>

                {/* 3. Pratinjau Teks Pesan WhatsApp */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    Pratinjau Teks Pesan WhatsApp:
                  </span>
                  <div
                    data-testid="preview-wa-message-text"
                    className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto"
                  >
                    {buildMessageText(previewRow)}
                  </div>
                </div>

                {/* 4. Tombol Aksi Pratinjau & Pengiriman */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      data-testid="btn-kirim-waha-single"
                      onClick={() => handleSendSingleWaha(previewRow)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0b5751] hover:bg-[#115e59] text-white text-xs font-bold transition shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>
                        {previewRow.hasPhone
                          ? `Kirim ke Wali (${previewRow.phone})`
                          : 'Isi Nomor WA Wali & Kirim'}
                      </span>
                    </button>

                    <button
                      type="button"
                      data-testid="btn-kirim-wa-web"
                      onClick={() => handleOpenDirectWa(previewRow)}
                      disabled={isProcessingWaWeb}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-emerald-600 text-xs font-bold text-emerald-800 hover:bg-emerald-50 transition disabled:opacity-40 shadow-2xs cursor-pointer"
                      title="Kirim via WhatsApp Web (Gambar Kartu Rapor otomatis disalin ke Clipboard)"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>{isProcessingWaWeb ? 'Menyiapkan...' : 'Kirim via WA Web'}</span>
                    </button>
                  </div>

                  {/* Tombol Unduh Gambar PNG & Salin Gambar */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      data-testid="btn-download-rapor-png"
                      onClick={() => handleDownloadRaporImage(previewRow)}
                      disabled={isDownloadingRapor}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{isDownloadingRapor ? 'Mengunduh...' : 'Unduh Gambar PNG'}</span>
                    </button>

                    <button
                      type="button"
                      data-testid="btn-copy-rapor-png"
                      onClick={() => handleCopyRaporImage(previewRow)}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Salin Gambar</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-500 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-200/70">
                    <strong>Tips Kirim WA Web:</strong> Saat klik &quot;Kirim via WA Web&quot;, gambar Kartu Rapor Digital <strong>otomatis disalin ke Clipboard</strong>. Di ruang obrolan WhatsApp Web, cukup tekan{' '}
                    <kbd className="px-1 py-0.5 bg-white rounded border border-slate-300 font-mono text-[9px] font-bold">
                      Ctrl + V
                    </kbd>{' '}
                    untuk menempelkan gambar beserta teks laporan.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-500">
                Pilih salah satu baris santri di tabel sebelah kiri untuk melihat pratinjau Kartu Rapor Digital Hafalan.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== MODAL ISI / UBAH NOMOR WA SANTRI (GAMBAR 2) ==================== */}
      {editingPhoneRow && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="modal-edit-phone-santri"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Phone className="w-5 h-5 text-emerald-700" />
                <h3 className="font-bold text-base text-slate-900">
                  No. Telepon / WA Aktif Wali Santri
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPhoneRow(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickPhone} className="space-y-4 text-xs">
              <div>
                <p className="text-slate-600 leading-relaxed">
                  Perbarui kolom <strong>No. Telepon / WA Aktif</strong> pada biodata santri{' '}
                  <strong className="text-slate-900">{editingPhoneRow.row.nama}</strong> (NIS:{' '}
                  {editingPhoneRow.row.no_induk}):
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  No. Telepon / WA Aktif
                </label>
                <input
                  type="text"
                  data-testid="input-quick-phone-santri"
                  value={phoneInputValue}
                  onChange={(e) => setPhoneInputValue(e.target.value)}
                  placeholder="08..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white font-mono text-xs text-slate-900 focus:outline-none focus:border-emerald-600"
                  autoFocus
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Otomatis dikonversi ke format internasional (628...) saat pengiriman WhatsApp.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingPhoneRow(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  data-testid="btn-save-quick-phone"
                  disabled={isSavingPhone}
                  className="px-5 py-2 rounded-xl bg-[#0b5751] hover:bg-[#115e59] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSavingPhone ? 'Menyimpan...' : 'Simpan Nomor WA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL PENGATURAN GATEWAY WAHA ==================== */}
      {settingsModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="modal-gateway-waha"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Pengaturan WhatsApp Gateway (WAHA)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl border bg-slate-50 border-slate-200">
                {gatewayStatus.online ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-emerald-800">
                            WhatsApp Berhasil Terhubung!
                          </span>
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Nomor Pengirim: <strong>+{gatewayStatus.phone || 'Aktif'}</strong>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          confirm(
                            'Apakah Anda yakin ingin memutuskan koneksi WhatsApp ini untuk mengganti nomor?'
                          )
                        ) {
                          await logoutWahaSession(wahaConfig);
                          showToast('Sesi WhatsApp telah diputuskan.');
                          void checkGateway(wahaConfig);
                        }
                      }}
                      className="px-3 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-bold transition shrink-0 cursor-pointer"
                    >
                      Putuskan / Logout
                    </button>
                  </div>
                ) : gatewayStatus.status === 'SCAN_QR_CODE' && gatewayStatus.qrCode ? (
                  <div className="text-center space-y-3 py-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-bold">
                      <span>Scan QR Code WhatsApp di Bawah Ini:</span>
                    </div>

                    <div className="bg-white p-3 rounded-2xl border-2 border-dashed border-emerald-500 inline-block shadow-sm">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={gatewayStatus.qrCode}
                        alt="QR Code WhatsApp"
                        className="w-56 h-56 mx-auto rounded-lg select-none"
                      />
                    </div>

                    <div className="text-left bg-white p-3.5 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                      <p className="font-bold text-slate-800">Langkah Menghubungkan:</p>
                      <ol className="list-decimal list-inside space-y-1 leading-relaxed">
                        <li>
                          Buka aplikasi <strong>WhatsApp</strong> di HP Anda.
                        </li>
                        <li>
                          Ketuk menu titik tiga (⋮) atau <strong>Pengaturan</strong> &gt;{' '}
                          <strong>Perangkat Tertaut</strong>.
                        </li>
                        <li>
                          Ketuk tombol <strong>Tautkan Perangkat</strong> lalu arahkan kamera HP ke QR Code di atas.
                        </li>
                      </ol>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                        <span className="font-bold text-xs text-rose-700">
                          Status Gateway: Offline / Belum Terhubung
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => checkGateway(wahaConfig)}
                        disabled={checkingGateway}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:underline cursor-pointer"
                      >
                        <RefreshCw
                          className={`w-3 h-3 ${checkingGateway ? 'animate-spin' : ''}`}
                        />
                        <span>Cek Sinyal Gateway</span>
                      </button>
                    </div>
                    {gatewayStatus.message && (
                      <p className="text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 leading-relaxed">
                        {gatewayStatus.message}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  URL Server WAHA (HTTP API):
                </label>
                <div className="flex gap-2 mb-1.5">
                  <input
                    type="text"
                    value={wahaConfig.baseUrl}
                    onChange={(e) =>
                      setWahaConfig({ ...wahaConfig, baseUrl: e.target.value })
                    }
                    placeholder="Contoh: http://localhost:3008 atau https://...trycloudflare.com"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      void checkGateway(wahaConfig);
                      showToast('Memeriksa koneksi server...');
                    }}
                    disabled={checkingGateway}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold border border-slate-300 text-xs shrink-0 cursor-pointer"
                  >
                    Uji Koneksi
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="text-[10px] text-slate-400">Pilihan Cepat:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const nextCfg = { ...wahaConfig, baseUrl: 'http://localhost:3008' };
                      setWahaConfig(nextCfg);
                      void checkGateway(nextCfg);
                    }}
                    className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200 hover:bg-slate-200 cursor-pointer"
                  >
                    Port Lokal (http://localhost:3008)
                  </button>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  API Key WAHA (Opsional):
                </label>
                <input
                  type="password"
                  value={wahaConfig.apiKey}
                  onChange={(e) =>
                    setWahaConfig({ ...wahaConfig, apiKey: e.target.value })
                  }
                  placeholder="Kosongkan jika WAHA tidak dipasangi API Key"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Jeda Minimal (Detik):
                  </label>
                  <input
                    type="number"
                    min={2}
                    max={15}
                    value={wahaConfig.delayMin}
                    onChange={(e) =>
                      setWahaConfig({
                        ...wahaConfig,
                        delayMin: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Jeda Maksimal (Detik):
                  </label>
                  <input
                    type="number"
                    min={3}
                    max={30}
                    value={wahaConfig.delayMax}
                    onChange={(e) =>
                      setWahaConfig({
                        ...wahaConfig,
                        delayMax: Math.max(2, Number(e.target.value)),
                      })
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSettingsModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  saveWahaConfig(wahaConfig);
                  setSettingsModalOpen(false);
                  showToast('Pengaturan WAHA berhasil disimpan.');
                  void checkGateway(wahaConfig);
                }}
                className="px-5 py-2 rounded-xl bg-[#0b5751] hover:bg-[#115e59] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL DRAF TEMPLATE PESAN ==================== */}
      {templateModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          data-testid="modal-draf-pesan-wa"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-700" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Sesuaikan Draf Pesan WhatsApp
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTemplateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Variabel dinamis yang tersedia:{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">
                  &#123;nama&#125;
                </code>
                ,{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">
                  &#123;nis&#125;
                </code>
                ,{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">
                  &#123;kelas&#125;
                </code>
                ,{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">
                  &#123;kamar&#125;
                </code>
                ,{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">
                  &#123;mustahiq&#125;
                </code>
                ,{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">
                  &#123;materi&#125;
                </code>
                ,{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">
                  &#123;kategori&#125;
                </code>
                ,{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">
                  &#123;target&#125;
                </code>
                ,{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">
                  &#123;capaian&#125;
                </code>
                ,{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">
                  &#123;persen&#125;
                </code>
                ,{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">
                  &#123;status&#125;
                </code>
                ,{' '}
                <code className="bg-slate-100 px-1 py-0.5 rounded text-emerald-800 font-bold">
                  &#123;riwayat_terakhir&#125;
                </code>
              </p>

              <textarea
                rows={11}
                value={wahaConfig.messageTemplate}
                onChange={(e) =>
                  setWahaConfig({ ...wahaConfig, messageTemplate: e.target.value })
                }
                className="w-full p-3.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-mono text-xs focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() =>
                  setWahaConfig({
                    ...wahaConfig,
                    messageTemplate: DEFAULT_WAHA_CONFIG.messageTemplate,
                  })
                }
                className="text-[11px] text-slate-500 hover:underline cursor-pointer"
              >
                Reset ke Teks Bawaan
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-600 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    saveWahaConfig(wahaConfig);
                    setTemplateModalOpen(false);
                    showToast('Draf pesan berhasil diperbarui.');
                  }}
                  className="px-5 py-2 rounded-xl bg-[#0b5751] hover:bg-[#115e59] text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Simpan Draf
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== MODAL PANDUAN PENGIRIMAN WA WEB ==================== */}
      {waWebModalInfo && waWebModalInfo.open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
        >
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-extrabold text-base text-slate-900">
                  Kirim Kartu Rapor ke WhatsApp Web
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setWaWebModalInfo(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                WhatsApp Web telah dibuka untuk penerima:{' '}
                <strong className="text-slate-900">{waWebModalInfo.namaSantri}</strong> (
                {waWebModalInfo.phone}).
              </p>

              {waWebModalInfo.hasImageCopied ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Gambar Kartu Rapor Otomatis Tersalin ke Clipboard!</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] text-emerald-900 leading-relaxed">
                    <li>Buka tab WhatsApp Web yang baru saja terbuka.</li>
                    <li>
                      Klik kolom ketik pesan lalu tekan{' '}
                      <kbd className="px-1.5 py-0.5 bg-white rounded border border-emerald-300 font-mono font-bold text-slate-800">
                        Ctrl + V
                      </kbd>{' '}
                      (atau klik kanan &gt; Tempel).
                    </li>
                    <li>Gambar Kartu Rapor Digital akan langsung terlampir di WhatsApp.</li>
                    <li>
                      Tekan <strong>Kirim / Enter</strong> bersama teks laporan.
                    </li>
                  </ol>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                  <p className="font-bold text-amber-800">Perhatian Salin Clipboard</p>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    Izin salin gambar otomatis ke clipboard dibatasi oleh browser Anda. Gunakan tombol &quot;Unduh Gambar PNG&quot; pada panel pratinjau untuk melampirkan gambar secara manual di WhatsApp Web.
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWaWebModalInfo(null)}
                className="px-5 py-2 rounded-xl bg-[#0b5751] hover:bg-[#115e59] text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
